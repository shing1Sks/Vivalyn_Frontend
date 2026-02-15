export default function Logo() {
  return (
    <a href="/" className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
        <img src="./icon.png" alt="" />
      </div>
      <span className="text-xl font-semibold text-gray-900">Vivalyn</span>
    </a>
  )
}
