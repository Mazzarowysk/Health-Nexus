import io
import re

with io.open('MANUAL_DO_USUARIO_HEALTH_NEXUS.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Very basic Markdown to HTML
html_content = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Manual do Usuário - Health Nexus</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
  h1, h2, h3 { color: #1e40af; }
  code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; }
  pre { background: #f1f5f9; padding: 1rem; border-radius: 8px; overflow-x: auto; }
</style>
</head>
<body>
<div style="background-color:#eff6ff; padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
  <h1 style="margin-top:0;">Health Nexus</h1>
  <p>Manual do Usuário</p>
</div>
'''

md_content = re.sub(r'^### (.*)', r'<h3>\1</h3>', md_content, flags=re.MULTILINE)
md_content = re.sub(r'^## (.*)', r'<h2>\1</h2>', md_content, flags=re.MULTILINE)
md_content = re.sub(r'^# (.*)', r'<h1>\1</h1>', md_content, flags=re.MULTILINE)
md_content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', md_content)
md_content = re.sub(r'^- (.*)', r'<li>\1</li>', md_content, flags=re.MULTILINE)
md_content = md_content.replace('</li>\n<li>', '</li><li>')

html_content += md_content.replace('\n\n', '<br><br>')
html_content += '</body></html>'

with io.open('public/manual_do_usuario.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('HTML Manual updated.')
