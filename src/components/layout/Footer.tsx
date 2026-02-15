import Logo from '../ui/Logo'
import { FOOTER_LINKS } from '../../lib/constants'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <Logo />
            <p className="mt-4 text-sm text-gray-500 max-w-[240px]">
              AI agents that scale 1:1 impact across your organization.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-[120ms]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-[120ms]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-[120ms]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
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
