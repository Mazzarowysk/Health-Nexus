import sys
content = open('src/main.js', 'r', encoding='utf-8').read()

content = content.replace(
    "import './tabs/tv.js';\nimport { generateMockData }",
    "import './tabs/tv.js';\nimport './tabs/kanban.js';\nimport { generateMockData }"
)

content = content.replace(
    "    { id: 'leitos', label: 'Leitos', icon: 'fa-bed-pulse' },",
    "    { id: 'leitos', label: 'Leitos', icon: 'fa-bed-pulse' },\n    { id: 'kanban', label: 'Kanban', icon: 'fa-table-columns' },"
)

content = content.replace(
    "    leitos:        'Gestão de Leitos',",
    "    leitos:        'Gestão de Leitos',\n    kanban:        'Kanban de Internação',"
)

content = content.replace(
    "    leitos: 'Leitos',",
    "    leitos: 'Leitos',\n    kanban: 'Kanban',"
)

content = content.replace(
    "  } else if (state.activeTab === 'leitos') {",
    "  } else if (state.activeTab === 'kanban') {\n    window.renderKanbanTab();\n  } else if (state.activeTab === 'leitos') {"
)

# Fix allowedTabs
content = content.replace("'leitos', 'financeiro'", "'leitos', 'kanban', 'financeiro'")
content = content.replace("'consultorios', 'leitos'", "'consultorios', 'leitos', 'kanban'")
content = content.replace("'estagnacao', 'leitos'", "'estagnacao', 'leitos', 'kanban'")

open('src/main.js', 'w', encoding='utf-8').write(content)
print('Done!')
