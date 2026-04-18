import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'
import { FOOTER_LINKS } from '../../lib/constants'
import type { FooterLinks, FooterLinkItem } from '../../lib/constants'

const SECTION_LABELS: Record<keyof FooterLinks, string> = {
  product: 'Product',
  company: 'Company',
  resources: 'Resources',
  legal: 'Legal',
}

function isInternalRoute(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('/#')
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <Logo />
            <p className="mt-4 text-sm text-gray-500 max-w-[240px]">
              AI agents that scale 1:1 impact across your organization.
            </p>
          </div>

          {(Object.entries(FOOTER_LINKS) as Array<[keyof FooterLinks, FooterLinkItem[]]>)
            .filter(([, links]) => links.length > 0)
            .map(([section, links]) => (
              <div key={section}>
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  {SECTION_LABELS[section]}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {isInternalRoute(link.href) ? (
                        <Link
                          to={link.href}
                          className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-[120ms]"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-[120ms]"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-400 text-center">
            &copy; {new Date().getFullYear()} Vivalyn. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
