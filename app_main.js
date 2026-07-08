function MainApp({ userId, userEmail }){
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);
  const [tab, setTab] = useState('empresas');
  const [toast, setToast] = useState('');
  const [empresaModal, setEmpresaModal] = useState(null);

  function showToast(msg){
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function loadEmpresas(){
    setLoadingEmpresas(true);
    const { data, error } = await sb.from('empresas').select('*').order('created_at', { ascending: false });
    if(!error) setEmpresas(data || []);
    setLoadingEmpresas(false);
  }
  useEffect(() => { loadEmpresas(); }, []);

  const empresa = empresas.find(e => e.id === empresaId) || null;

  async function handleSaveEmpresa(fields){
    if(fields.id){
      const { error } = await sb.from('empresas').update({ nombre: fields.nombre, tipo_construccion: fields.tipo_construccion }).eq('id', fields.id);
      if(error){ showToast('Error: ' + error.message); return; }
    } else {
      const { error } = await sb.from('empresas').insert({ nombre: fields.nombre, tipo_construccion: fields.tipo_construccion, user_id: userId });
      if(error){ showToast('Error: ' + error.message); return; }
    }
    setEmpresaModal(null);
    await loadEmpresas();
    showToast('Guardado');
  }

  async function handleDeleteEmpresa(id){
    if(!window.confirm('¿Eliminar esta empresa y toda su estructura? Esta acción no se puede deshacer.')) return;
    const { error } = await sb.from('empresas').delete().eq('id', id);
    if(error){ showToast('Error: ' + error.message); return; }
    if(empresaId === id){ setEmpresaId(null); setTab('empresas'); }
    await loadEmpresas();
    showToast('Empresa eliminada');
  }

  function selectEmpresa(id){ setEmpresaId(id); setTab('estructura'); }

  return h('div', { className: 'app' },
    h('div', { className: 'nav' },
      h('div', { className: 'nav-logo' }, 'OBRA'),
      h('div', { className: 'flex aic g8' },
        h('span', { className: 'text3', style: { fontSize: 11 } }, userEmail),
        h('button', { className: 'modal-close', onClick: () => sb.auth.signOut(), title: 'Cerrar sesión' }, '⎋')
      )
    ),
    empresa ? h('div', { className: 'breadcrumb' },
      h('button', { className: 'bc-btn', onClick: () => { setEmpresaId(null); setTab('empresas'); } }, 'Empresas'),
      h('span', { className: 'bc-sep' }, '›'),
      h('span', null, empresa.nombre)
    ) : null,
    h('div', { className: 'main' },
      h('div', { className: 'page' },
        tab === 'empresas' ? h(EmpresasList, {
          empresas: empresas, loading: loadingEmpresas,
          onSelect: selectEmpresa, onEdit: e => setEmpresaModal(e),
          onNew: () => setEmpresaModal({}), onDelete: handleDeleteEmpresa
        }) : null,
        (tab !== 'empresas' && !empresa) ? h('div', { className: 'card' },
          h('div', { className: 'card-title' }, 'Sin empresa seleccionada'),
          h('div', { className: 'text2', style: { fontSize: 13, marginTop: 6 } }, 'Selecciona una empresa en la pestaña "Empresas" para continuar.')
        ) : null,
        (tab === 'estructura' && empresa) ? h(EstructuraView, { empresa: empresa, showToast: showToast }) : null,
        (tab === 'responsables' && empresa) ? h(ResponsablesView, { empresa: empresa, showToast: showToast }) : null,
        (tab === 'dashboard' && empresa) ? h(DashboardView, { empresa: empresa }) : null
      )
    ),
    h(BottomNav, { tab: tab, setTab: setTab }),
    empresaModal !== null ? h(EmpresaFormModal, { empresa: empresaModal, onClose: () => setEmpresaModal(null), onSave: handleSaveEmpresa }) : null,
    toast ? h('div', { className: 'toast' }, toast) : null
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(ErrorBoundary, null, h(App)));
