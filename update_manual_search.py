import re

with open('c:/Health Nexus/src/manualTabbed.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update the overlay.innerHTML to include the results dropdown
overlay_html_old = """          <div style="position: relative; width: 260px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.85rem;"></i>
            <input type="text" id="manual-modal-search" placeholder="Buscar botão ou ação..." value="${searchQuery}" style="
              width: 100%; padding: 8px 12px 8px 34px; background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f8fafc;
              font-size: 0.85rem; outline: none; transition: border-color 0.2s;
            " onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'">
          </div>"""

overlay_html_new = """          <div style="position: relative; width: 320px;" class="manual-search-wrapper">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 0.85rem; z-index: 3;"></i>
            <input type="text" id="manual-modal-search" placeholder="Buscar botão ou ação..." style="
              width: 100%; padding: 8px 12px 8px 34px; background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #f8fafc;
              font-size: 0.85rem; outline: none; transition: border-color 0.2s; position: relative; z-index: 2;
            " autocomplete="off">
            <div id="manual-search-results" style="
              display: none; position: absolute; top: 46px; left: 0; right: 0;
              background: #0b0f19; border: 1px solid rgba(129, 140, 248, 0.5);
              border-radius: 12px; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.7);
              max-height: 400px; overflow-y: auto; scrollbar-width: thin;
            "></div>
          </div>"""
text = text.replace(overlay_html_old, overlay_html_new)


# 2. Update renderModalContent to remove all search logic
# I will use a simple regex to remove the filtering inside renderModalContent
render_start_pattern = r"    // Filtrar conteǧdo por busca se houver query[\s\S]*?(?=    const buttonsCardsHtml)"
# Oops, because of encoding it might be "Filtrar conte.do por busca"
render_start_pattern_regex = re.compile(r"    // Filtrar conte.do por busca se houver query.*?(?=    const buttonsCardsHtml =)", re.DOTALL)

render_new_logic = """    let filteredButtons = activeData.buttons;
    let aiResponseHtml = '';
"""

text = render_start_pattern_regex.sub(render_new_logic, text)

# Remove the use of isSearching in the output of buttonsCardsHtml
text = re.sub(r"\$\{isSearching && b\._moduleTitle \? `.*?` : ''\}", "", text)


# 3. Replace the input event listener at the end
input_listener_old = r"""  overlay\.addEventListener\('input', \(e\) => \{
    if \(e\.target\.id === 'manual-modal-search'\) \{
      searchQuery = e\.target\.value;
      renderModalContent\(\);
    \}
  \}\);"""

input_listener_new = """  const searchInput = overlay.querySelector('#manual-modal-search');
  const searchResultsContainer = overlay.querySelector('#manual-search-results');

  const performSearch = () => {
    const rawQuery = searchInput.value.trim();
    if (!rawQuery) {
      searchResultsContainer.style.display = 'none';
      return;
    }
    const q = rawQuery.toLowerCase();
    
    let filteredButtons = [];
    manualData.forEach(module => {
      module.buttons.forEach(b => {
        const match = b.name.toLowerCase().includes(q) ||
               b.description.toLowerCase().includes(q) ||
               b.type.toLowerCase().includes(q) ||
               (b.rules && b.rules.toLowerCase().includes(q)) ||
               (b.keywords && b.keywords.some(k => k.toLowerCase().includes(q)));
               
        if (match) {
           filteredButtons.push({ ...b, _moduleTitle: module.title, _moduleId: module.id });
        }
      });
    });

    let aiResponseHtml = '';
    const aiCopilot = typeof getNexusAICopilotResponse === 'function' ? getNexusAICopilotResponse(rawQuery, rawQuery) : null;
    if (aiCopilot) {
      const isDefault = aiCopilot.summary.includes('Analisei sua busca');
      const isQuestion = rawQuery.endsWith('?') || /^(como|onde|qual|o que|quem|quando|por que|posso|tem como|adicionar|incluir)/i.test(rawQuery);
      
      let currentUserRole = 'Desconhecido';
      try {
        const storedUser = JSON.parse(sessionStorage.getItem('hn_user'));
        if (storedUser && storedUser.role) currentUserRole = storedUser.role;
      } catch(e) {}

      if (!isDefault) {
        const targetTab = manualData.find(m => m.id === aiCopilot.actionTarget) || manualData[0];
        const targetRoles = targetTab.roles || [];
        const isMaster = currentUserRole === 'Master' || currentUserRole === 'Administrador';
        const hasAccess = isMaster || targetRoles.includes(currentUserRole);

        if (hasAccess) {
          aiResponseHtml = `
            <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(79, 70, 229, 0.05)); border-bottom: 1px solid rgba(167, 139, 250, 0.3); padding: 12px; display: flex; gap: 12px; cursor: pointer;" class="manual-search-result-item" data-tab="${aiCopilot.actionTarget}">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #7c3aed; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <h5 style="color: #a78bfa; font-size: 0.9rem; font-weight: 700; margin: 0 0 4px 0;">${aiCopilot.title}</h5>
                <p style="color: #e2e8f0; font-size: 0.8rem; margin: 0; line-height: 1.4;">${aiCopilot.summary}</p>
              </div>
            </div>
          `;
        } else {
          aiResponseHtml = `
            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05)); border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding: 12px; display: flex; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #ef4444; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h5 style="color: #f87171; font-size: 0.9rem; font-weight: 700; margin: 0 0 4px 0;">Acesso Restrito</h5>
                <p style="color: #e2e8f0; font-size: 0.8rem; margin: 0; line-height: 1.4;">A IA encontrou uma funcionalidade, mas exige perfil: <strong>${targetRoles.join(', ')}</strong>.</p>
              </div>
            </div>
          `;
        }
      }
    }

    let resultsHtml = aiResponseHtml;
    if (filteredButtons.length === 0 && !aiResponseHtml) {
      resultsHtml += `<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.85rem;">Nenhum botão encontrado.</div>`;
    } else {
      filteredButtons.forEach(b => {
        resultsHtml += `
          <div class="manual-search-result-item" data-tab="${b._moduleId}" data-btn="${b.name}" style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: background 0.2s;">
            <div style="color: ${b.color || '#fff'}; font-weight: 600; font-size: 0.88rem; margin-bottom: 4px;">${b.name}</div>
            <div style="color: #94a3b8; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.description}</div>
            <div style="color: #64748b; font-size: 0.7rem; margin-top: 4px; font-weight: 600;">Em: ${b._moduleTitle}</div>
          </div>
        `;
      });
    }

    searchResultsContainer.innerHTML = resultsHtml;
    searchResultsContainer.style.display = 'block';
  };

  searchInput.addEventListener('input', performSearch);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) performSearch();
  });

  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('.manual-search-wrapper')) {
      searchResultsContainer.style.display = 'none';
    }
    
    const resultItem = e.target.closest('.manual-search-result-item');
    if (resultItem) {
      const tabId = resultItem.dataset.tab;
      const btnName = resultItem.dataset.btn;
      
      activeTabId = tabId;
      renderModalContent();
      searchResultsContainer.style.display = 'none';
      searchInput.value = '';
      
      if (btnName) {
        setTimeout(() => {
          const modData = manualData.find(m => m.id === activeTabId);
          const foundBtn = modData ? modData.buttons.find(b => b.name === btnName) : null;
          if (foundBtn) showCardDetailModal(foundBtn, modData);
        }, 100);
      }
    }
  });"""

text = re.sub(input_listener_old, input_listener_new, text)

# Remove searchQuery variable
text = text.replace("let searchQuery = '';", "")
text = text.replace("value=\"${searchQuery}\"", "")

with open('c:/Health Nexus/src/manualTabbed.js', 'w', encoding='utf-8') as f:
    f.write(text)
