/**
 * useAgentSession — manages a real-time voice session with an agent.
 *
 * Handles:
 *   - WebSocket connection lifecycle
 *   - Mic capture (AudioContext 16kHz, ScriptProcessorNode → Int16 PCM binary frames)
 *   - TTS playback (AudioContext 24kHz, gapless buffer scheduling)
 *   - State machine: connecting → active → ended / error
 *
 * React Strict Mode safe: uses a per-effect `mounted` local variable so
 * the test-unmount/remount cycle does not corrupt state or resources.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

export type AgentState = 'listening' | 'thinking' | 'speaking'
export type SessionPhase = 'connecting' | 'active' | 'ended' | 'error'

export interface TranscriptEntry {
  role: 'user' | 'agent'
  text: string
}

interface UseAgentSessionOptions {
  agentId: string
  email: string
  name: string
  mode: 'live' | 'test'
  token?: string
}

interface UseAgentSessionReturn {
  phase: SessionPhase
  agentState: AgentState
  transcript: TranscriptEntry[]
  micEnabled: boolean
  toggleMic: () => void
  endSession: () => void
  error: string | null
}

export function useAgentSession(opts: UseAgentSessionOptions): UseAgentSessionReturn {
  const { agentId, email, name, mode, token } = opts

  const [phase, setPhase] = useState<SessionPhase>('connecting')
  const [agentState, setAgentState] = useState<AgentState>('listening')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [micEnabled, setMicEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const micCtxRef = useRef<AudioContext | null>(null)
  const playCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const sendAudioRef = useRef(true)

  // ── Cleanup (idempotent) ─────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    micCtxRef.current?.close().catch(() => {})
    micCtxRef.current = null
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null
    playCtxRef.current?.close().catch(() => {})
    playCtxRef.current = null
    nextPlayTimeRef.current = 0
  }, [])

  // ── TTS audio playback ──────────────────────────────────────────────────────
  const enqueueAudio = useCallback((rawBuffer: ArrayBuffer) => {
    const playCtx = playCtxRef.current
    if (!playCtx || playCtx.state === 'closed') return

    const int16 = new Int16Array(rawBuffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }

    const audioBuf = playCtx.createBuffer(1, float32.length, 24000)
    audioBuf.copyToChannel(float32, 0)

    const source = playCtx.createBufferSource()
    source.buffer = audioBuf
    source.connect(playCtx.destination)

    const startAt = Math.max(nextPlayTimeRef.current, playCtx.currentTime)
    source.start(startAt)
    nextPlayTimeRef.current = startAt + audioBuf.duration
  }, [])

  // ── Start mic ───────────────────────────────────────────────────────────────
  const startMic = useCallback(async (ws: WebSocket, mountedCheck: () => boolean) => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      if (mountedCheck()) {
        setError('Microphone access denied. Please allow microphone and refresh.')
        setPhase('error')
      }
      return
    }

    if (!mountedCheck()) {
      stream.getTracks().forEach(t => t.stop())
      return
    }

    micStreamRef.current = stream

    const micCtx = new AudioContext({ sampleRate: 16000 })
    micCtxRef.current = micCtx

    const source = micCtx.createMediaStreamSource(stream)
    const processor = micCtx.createScriptProcessor(1024, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (!sendAudioRef.current) return
      if (ws.readyState !== WebSocket.OPEN) return

      const input = e.inputBuffer.getChannelData(0)
      const pcm = new Int16Array(input.length)
      for (let i = 0; i < input.length; i++) {
        pcm[i] = Math.max(-32768, Math.min(32767, input[i] * 32768))
      }
      ws.send(pcm.buffer)
    }

    source.connect(processor)
    processor.connect(micCtx.destination)
  }, [])

  // ── Connect ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // `mounted` guards against React Strict Mode's double-invoke of effects.
    // Each invocation of the effect has its own `mounted` variable; handlers
    // from a previous (cleaned-up) invocation check their own copy and bail.
    let mounted = true
    const mountedCheck = () => mounted

    playCtxRef.current = new AudioContext({ sampleRate: 24000 })

    const wsBase = BASE_URL.replace(/^http/, 'ws')
    const params = new URLSearchParams({ email, name, mode })
    if (mode === 'test' && token) params.set('token', token)
    const ws = new WebSocket(`${wsBase}/ws/agent/${agentId}/session?${params}`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onmessage = async (event) => {
      if (!mounted) return  // Strict Mode guard

      if (event.data instanceof ArrayBuffer) {
        setAgentState('speaking')
        sendAudioRef.current = false
        enqueueAudio(event.data)
        return
      }

      let msg: { type: string; text?: string; message?: string }
      try {
        msg = JSON.parse(event.data as string)
      } catch {
        return
      }

      switch (msg.type) {
        case 'session_ready': {
          const ctx = playCtxRef.current
          if (ctx && ctx.state === 'suspended') {
            await ctx.resume().catch(() => {})
          }
          if (!mounted) return  // check again after await
          setPhase('active')
          setAgentState('listening')
          startMic(ws, mountedCheck)
          break
        }

        case 'user_transcript':
          setAgentState('thinking')
          if (msg.text) {
            setTranscript(prev => [...prev, { role: 'user', text: msg.text! }])
          }
          break

        case 'agent_text_delta':
          // Don't override 'speaking' — audio chunks and text deltas can arrive concurrently
          setAgentState(prev => prev === 'speaking' ? 'speaking' : 'thinking')
          break

        case 'audio_done': {
          // Poll until the scheduled audio has finished playing
          const checkDone = () => {
            if (!mounted) return
            const ctx = playCtxRef.current
            if (ctx && ctx.state !== 'closed' && ctx.currentTime >= nextPlayTimeRef.current - 0.05) {
              sendAudioRef.current = true
              setAgentState('listening')
            } else {
              setTimeout(checkDone, 100)
            }
          }
          setTimeout(checkDone, 100)
          break
        }

        case 'agent_done':
          if (msg.text) {
            setTranscript(prev => [...prev, { role: 'agent', text: msg.text! }])
          }
          break

        case 'error':
          console.warn('[AgentSession] server error:', msg.message)
          setAgentState('listening')
          sendAudioRef.current = true
          break
      }
    }

    ws.onerror = () => {
      if (!mounted) return  // Strict Mode guard
      setError('Connection error. Please try again.')
      setPhase('error')
    }

    ws.onclose = (event) => {
      if (!mounted) return  // Strict Mode guard — ignore test-unmount close
      const reasonMap: Record<number, string> = {
        4003: 'This agent is not currently live.',
        4001: 'Invalid session token.',
        4004: 'Agent not found.',
        4400: 'Missing email or name.',
        4500: 'Server error. Please try again.',
      }
      // Only show error if we never made it past 'connecting'
      setPhase(prev => {
        if (prev === 'connecting') {
          setError(reasonMap[event.code] ?? 'Could not connect to agent.')
          return 'error'
        }
        return prev === 'ended' ? 'ended' : 'ended'
      })
      cleanup()
    }

    return () => {
      mounted = false
      cleanup()
      // Close the WebSocket only if it's still open/connecting
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleMic = useCallback(() => {
    setMicEnabled(prev => {
      const next = !prev
      sendAudioRef.current = next && agentState === 'listening'
      return next
    })
  }, [agentState])

  const endSession = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'end_session' }))
    }
    setPhase('ended')
    cleanup()
  }, [cleanup])

  // Gate audio sending on micEnabled + agentState
  useEffect(() => {
    sendAudioRef.current = micEnabled && agentState === 'listening'
  }, [micEnabled, agentState])

  return { phase, agentState, transcript, micEnabled, toggleMic, endSession, error }
}
