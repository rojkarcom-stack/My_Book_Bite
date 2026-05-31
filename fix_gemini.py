
import sys

with open('src/services/gemini.service.ts', 'r') as f:
    content = f.read()

# Fix SVG responsive line
content = content.replace('Ensure the SVG is responsive (e.g., `width="100%" viewBox="..."`) and clearly labeled **in English**.', 
                          'Ensure the SVG is responsive (e.g., \\`width="100%" viewBox="..."\\`) and clearly labeled **in English**.')

# Fix figure tag
content = content.replace('insert a `<figure>` tag', 'insert a \\`<figure>\\` tag')

# Fix img tag
content = content.replace('place an `<img>` tag', 'place an \\`<img>\\` tag')

# Fix id attribute
content = content.replace('unique `id` attribute', 'unique \\`id\\` attribute')

# Fix src attribute
content = content.replace('empty `src` attribute', 'empty \\`src\\` attribute')

# Fix alt attribute
content = content.replace('add a descriptive `alt` attribute', 'add a descriptive \\`alt\\` attribute')

# Fix img or svg tag
content = content.replace('Following the `<img>` or `<svg>` tag', 'Following the \\`<img>\\` or \\`<svg>\\` tag')

# Fix figcaption tag
content = content.replace('add a `<figcaption>` tag', 'add a \\`<figcaption>\\` tag')
content = content.replace('text inside this `<figcaption>` MUST', 'text inside this \\`<figcaption>\\` MUST')

# Fix example block
content = content.replace("Example: `[ { \"id\": \"img-a1b2c3\", \"prompt\": \"A simple digital illustration of a plant cell, showing the nucleus, chloroplasts, and cell wall clearly with distinct colors. Friendly, educational vector art style, white background, with clear English labels: 'Nucleus', 'Chloroplast', 'Cell Wall'.\" } ]`",
                          "Example: \\`[ { \"id\": \"img-a1b2c3\", \"prompt\": \"A simple digital illustration of a plant cell, showing the nucleus, chloroplasts, and cell wall clearly with distinct colors. Friendly, educational vector art style, white background, with clear English labels: 'Nucleus', 'Chloroplast', 'Cell Wall'.\" } ]\\`")

with open('src/services/gemini.service.ts', 'w') as f:
    f.write(content)
