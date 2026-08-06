import sys
content = open('src/tabs/kanban.js', 'r', encoding='utf-8').read()
content = content.replace('\\${', '${').replace('\\`', '`')
open('src/tabs/kanban.js', 'w', encoding='utf-8').write(content)
print('Unescaped kanban.js')
