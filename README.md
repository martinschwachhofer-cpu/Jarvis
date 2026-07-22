# J.A.R.V.I.S. — Voice & Text Interface

Ein modernes Jarvis-Interface im Iron-Man-Stil. Ein großer, animierter
HUD-Kern (Arc-Reactor mit rotierenden Ringen und pulsierendem Glühen), mit
dem du **per Sprache und per Text** kommunizieren und dein Ziel nennen
kannst — z. B. „Verdiene 500 € für mich".

## Öffnen
Einfach `index.html` im Browser öffnen (Chrome empfohlen für die
Spracherkennung). Kein Build, keine Installation nötig.

## Bedienung
- **🎙️ Mikrofon antippen** und sprechen (Web Speech API).
- Oder **ins Textfeld tippen** und Enter drücken.
- Das erkannte Ziel wird groß angezeigt und im Browser gespeichert
  (`localStorage`), bleibt also nach dem Neuladen erhalten.
- Jarvis antwortet gesprochen (klassische englische Stimme) und im Log.

## Zustände (visuell sichtbar)
- **READY** – wartet (cyan)
- **LISTENING** – hört zu (grün)
- **PROCESSING** – denkt nach
- **SPEAKING** – antwortet (gold)

## Hinweis
Dies ist zunächst **nur das Interface**. Die Antworten sind skriptete
Platzhalter — Jarvis führt noch keine echten Aktionen aus. Nächster
möglicher Schritt: echte KI-Antworten via Claude-API und tatsächliche
Ausführung von Zielen.
