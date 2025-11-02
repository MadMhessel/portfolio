# Настройка заголовков безопасности для Atmosphere

Студия размещена на GitHub Pages, поэтому серверные заголовки нельзя задать в репозитории. Используйте CDN или обратный прокси (Cloudflare, Netlify, NGINX), чтобы включить следующие политики.

## Обязательные заголовки

- `Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' https://unpkg.com; img-src 'self' data: https://static-maps.yandex.ru https://madmhessel.github.io; connect-src 'self' https://unpkg.com; font-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://formsubmit.co;`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`

## Рекомендации по внедрению

1. **Cloudflare:** добавьте правила в разделе *Security > WAF > Custom Rules* или используйте *Transform Rules* для установки HTTP-заголовков.
2. **Netlify / Vercel:** настройте файл `_headers` или панель управления проекта.
3. **NGINX / Apache:** пропишите директивы в конфигурации виртуального хоста.
4. Проверяйте изменения через [securityheaders.com](https://securityheaders.com/) и Lighthouse.

## Почему нужен временный `<meta http-equiv>`

GitHub Pages игнорирует серверные CSP-заголовки. Временный `<meta http-equiv="Content-Security-Policy">` в HTML-файлах снижает риски XSS, пока не подключен CDN с полноценной политикой. При переходе на внешнюю инфраструктуру удалите мета-объявление, чтобы избежать конфликтов.
