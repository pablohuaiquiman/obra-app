function PartidasView({ fase, etapaNombre, responsables, onBack, showToast, refreshFases }){
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [hideCompletas, setHideCompletas] = useState(false);

  async function load(){
    setLoading(true);
    const { data, error } = await sb.from('partidas').select('*').eq('fase_id', fase.id).order('created_at');
    if(!error) setPartidas(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [fase.id]);

  async function handleSave(fields){
    const payload = {
      nombre: fields.nombre,
      fecha_inicio: fields.fecha_inicio,
      fecha_termino: fields.fecha_termino,
      responsable_id: fields.responsable_id,
      avance_porcentaje: fields.avance_porcentaje
    };
    await sb.from('catalogo_partidas').upsert({ nombre: fields.nombre }, { onConflict: 'nombre', ignoreDuplicates: true });
    if(fields.id){
      const { error } = await sb.from('partidas').update(payload).eq('id', fields.id);
      if(error){ showToast('Error: ' + error.message); return; }
    } else {
      const { error } = await sb.from('partidas').insert(Object.assign({}, payload, { fase_id: fase.id }));
      if(error){ showToast('Error: ' + error.message); return; }
    }
    setModal(null); await load(); await refreshFases(); showToast('Guardado');
  }

  async function handleDelete(id){
    if(!window.confirm('¿Eliminar esta partida?')) return;
    const { error } = await sb.from('partidas').delete().eq('id', id);
    if(error){ showToast('Error: ' + error.message); return; }
    await load(); await refreshFases(); showToast('Partida eliminada');
  }

  async function quickPct(p, pct){
    const { error } = await sb.from('partidas').update({ avance_porcentaje: pct }).eq('id', p.id);
    if(error){ showToast('Error: ' + error.message); return; }
    await load(); await refreshFases();
  }

  const visibles = hideCompletas ? partidas.filter(p => clientEstado(p) !== 'completado') : partidas;

  return h('div', { className: 'gap10' },
    h('div', { className: 'breadcrumb', style: { padding: 0, background: 'none', border: 'none', marginBottom: 4 } },
      h('button', { className: 'bc-btn', onClick: onBack }, '‹ ' + etapaNombre)
    ),
    h('div', { className: 'shdr' },
      h('div', { className: 'shdr-title' }, fase.nombre),
      h('button', { className: 'btn-primary', style: { width: 'auto', margin: 0, padding: '8px 14px' }, onClick: () => setModal({}) }, '+ Partida')
    ),
    h('div', { className: 'sw', onClick: () => setHideCompletas(!hideCompletas) },
      h('div', { className: 'sw-track' + (hideCompletas ? ' on' : '') }, h('div', { className: 'sw-thumb' })),
      h('div', { className: 'sw-label' }, 'Ocultar completadas (100%)')
    ),
    loading ? h('div', { className: 'text2' }, 'Cargando...') : null,
    (!loading && visibles.length === 0) ? h('div', { className: 'card' }, h('div', { className: 'text2' }, 'Sin partidas.')) : null,
    visibles.map(p => {
      const estado = clientEstado(p);
      const pillClass = estado === 'completado' ? 'pill-green' : estado === 'atrasado' ? 'pill-red' : 'pill-blue';
      return h('div', { key: p.id, className: 'p-item' + (estado === 'completado' ? ' done' : '') },
        h('div', { className: 'p-hdr' },
          h('div', { className: 'p-name' },
            p.nombre,
            h('div', { className: 'flex g6', style: { marginTop: 4, flexWrap: 'wrap' } },
              h('span', { className: 'pill ' + pillClass }, estado),
              responsableName(responsables, p.responsable_id) ? h('span', { className: 'resp-tag' }, responsableName(responsables, p.responsable_id)) : null,
              p.fecha_termino ? h('span', { className: 'text3 mono', style: { fontSize: 11 } }, 'Term: ' + p.fecha_termino) : null
            )
          ),
          h('div', { className: 'p-badge' }, Math.round(p.avance_porcentaje) + '%')
        ),
        h('div', { className: 'pct-btns' },
          [0, 25, 50, 75, 100].map(pct => h('button', {
            key: pct,
            className: 'pct-btn' + (Number(p.avance_porcentaje) === pct ? ' sel' : ''),
            style: Number(p.avance_porcentaje) === pct ? { background: 'var(--blue)' } : null,
            onClick: () => quickPct(p, pct)
          }, pct))
        ),
        h('div', { className: 'flex g8', style: { marginTop: 8 } },
          h('button', { className: 'pill pill-blue', onClick: () => setModal(p) }, 'Editar'),
          h('button', { className: 'pill pill-red', onClick: () => handleDelete(p.id) }, 'Eliminar')
        )
      );
    }),
    modal !== null ? h(PartidaFormModal, { partida: modal, responsables: responsables, onClose: () => setModal(null), onSave: handleSave }) : null
  );
}

function FasesView({ etapa, responsables, onBack, showToast, refreshEtapas }){
  const [fases, setFases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faseId, setFaseId] = useState(null);
  const [faseModal, setFaseModal] = useState(null);

  async function loadFases(){
    setLoading(true);
    const { data, error } = await sb.from('fases').select('*').eq('etapa_id', etapa.id).order('orden');
    if(!error) setFases(data || []);
    setLoading(false);
  }
  useEffect(() => { loadFases(); setFaseId(null); }, [etapa.id]);

  const fase = fases.find(f => f.id === faseId) || null;

  async function handleSaveFase(fields){
    if(fields.id){
      const { error } = await sb.from('fases').update({ nombre: fields.nombre, responsable_id: fields.responsable_id }).eq('id', fields.id);
      if(error){ showToast('Error: ' + error.message); return; }
    } else {
      const orden = fases.length ? Math.max.apply(null, fases.map(f => f.orden)) + 1 : 1;
      const { error } = await sb.from('fases').insert({ etapa_id: etapa.id, nombre: fields.nombre, orden: orden, responsable_id: fields.responsable_id });
      if(error){ showToast('Error: ' + error.message); return; }
    }
    setFaseModal(null); await loadFases(); await refreshEtapas(); showToast('Guardado');
  }

  async function handleDeleteFase(id){
    if(!window.confirm('¿Eliminar esta fase y todas sus partidas?')) return;
    const { error } = await sb.from('fases').delete().eq('id', id);
    if(error){ showToast('Error: ' + error.message); return; }
    if(faseId === id) setFaseId(null);
    await loadFases(); await refreshEtapas(); showToast('Fase eliminada');
  }

  if(loading) return h('div', { className: 'text2' }, 'Cargando...');

  if(!fase){
    return h('div', { className: 'gap10' },
      h('div', { className: 'breadcrumb', style: { padding: 0, background: 'none', border: 'none', marginBottom: 4 } },
        h('button', { className: 'bc-btn', onClick: onBack }, '‹ Etapas')
      ),
      h('div', { className: 'shdr' },
        h('div', { className: 'shdr-title' }, etapa.nombre),
        h('button', { className: 'btn-primary', style: { width: 'auto', margin: 0, padding: '8px 14px' }, onClick: () => setFaseModal({}) }, '+ Fase')
      ),
      fases.length === 0 ? h('div', { className: 'card' }, h('div', { className: 'text2' }, 'Sin fases.')) : null,
      fases.map(f => h('div', { key: f.id, className: 'card' },
        h('div', { className: 'flex jb aic', style: { cursor: 'pointer' }, onClick: () => setFaseId(f.id) },
          h('div', null,
            h('div', { style: { fontWeight: 700 } }, f.nombre),
            responsableName(responsables, f.responsable_id) ? h('span', { className: 'resp-tag' }, responsableName(responsables, f.responsable_id)) : null
          ),
          h('div', { className: 'mono bold', style: { color: 'var(--purple)' } }, Math.round(f.avance_porcentaje) + '%')
        ),
        h('div', { className: 'bar', style: { marginTop: 8 } }, h('div', { className: 'bar-fill', style: { width: f.avance_porcentaje + '%', background: 'var(--purple)' } })),
        h('div', { className: 'flex g8', style: { marginTop: 8 } },
          h('button', { className: 'pill pill-blue', onClick: (e) => { e.stopPropagation(); setFaseModal(f); } }, 'Editar'),
          h('button', { className: 'pill pill-red', onClick: (e) => { e.stopPropagation(); handleDeleteFase(f.id); } }, 'Eliminar')
        )
      )),
      faseModal !== null ? h(EtapaFaseFormModal, {
        title: faseModal.id ? 'Editar Fase' : 'Nueva Fase',
        item: faseModal, responsables: responsables,
        onClose: () => setFaseModal(null), onSave: handleSaveFase
      }) : null
    );
  }

  return h(PartidasView, {
    fase: fase, etapaNombre: etapa.nombre, responsables: responsables,
    onBack: () => setFaseId(null), showToast: showToast, refreshFases: loadFases
  });
}

function EstructuraView({ empresa, showToast }){
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [etapaId, setEtapaId] = useState(null);
  const [responsables, setResponsables] = useState([]);
  const [etapaModal, setEtapaModal] = useState(null);

  async function loadEtapas(){
    setLoading(true);
    const { data, error } = await sb.from('etapas').select('*').eq('empresa_id', empresa.id).order('orden');
    if(!error) setEtapas(data || []);
    setLoading(false);
  }
  async function loadResponsables(){
    const { data } = await sb.from('responsables').select('*').eq('empresa_id', empresa.id).order('nombre');
    setResponsables(data || []);
  }
  useEffect(() => { loadEtapas(); loadResponsables(); setEtapaId(null); }, [empresa.id]);

  const etapa = etapas.find(e => e.id === etapaId) || null;

  async function handleSaveEtapa(fields){
    if(fields.id){
      const { error } = await sb.from('etapas').update({ nombre: fields.nombre, responsable_id: fields.responsable_id }).eq('id', fields.id);
      if(error){ showToast('Error: ' + error.message); return; }
    } else {
      const orden = etapas.length ? Math.max.apply(null, etapas.map(e => e.orden)) + 1 : 1;
      const { error } = await sb.from('etapas').insert({ empresa_id: empresa.id, nombre: fields.nombre, orden: orden, responsable_id: fields.responsable_id });
      if(error){ showToast('Error: ' + error.message); return; }
    }
    setEtapaModal(null); await loadEtapas(); showToast('Guardado');
  }

  async function handleDeleteEtapa(id){
    if(!window.confirm('¿Eliminar esta etapa y todas sus fases/partidas?')) return;
    const { error } = await sb.from('etapas').delete().eq('id', id);
    if(error){ showToast('Error: ' + error.message); return; }
    if(etapaId === id) setEtapaId(null);
    await loadEtapas(); showToast('Etapa eliminada');
  }

  if(loading) return h('div', { className: 'text2' }, 'Cargando...');

  if(!etapa){
    return h('div', { className: 'gap10' },
      h('div', { className: 'shdr' },
        h('div', { className: 'shdr-title' }, 'Etapas'),
        h('button', { className: 'btn-primary', style: { width: 'auto', margin: 0, padding: '8px 14px' }, onClick: () => setEtapaModal({}) }, '+ Nueva')
      ),
      etapas.length === 0 ? h('div', { className: 'card' }, h('div', { className: 'text2' }, 'Sin etapas.')) : null,
      etapas.map(et => h('div', { key: et.id, className: 'card' },
        h('div', { className: 'flex jb aic', style: { cursor: 'pointer' }, onClick: () => setEtapaId(et.id) },
          h('div', null,
            h('div', { style: { fontWeight: 700 } }, et.nombre),
            responsableName(responsables, et.responsable_id) ? h('span', { className: 'resp-tag' }, responsableName(responsables, et.responsable_id)) : null
          ),
          h('div', { className: 'mono bold', style: { color: 'var(--blue)' } }, Math.round(et.avance_porcentaje) + '%')
        ),
        h('div', { className: 'bar', style: { marginTop: 8 } }, h('div', { className: 'bar-fill', style: { width: et.avance_porcentaje + '%', background: 'var(--blue)' } })),
        h('div', { className: 'flex g8', style: { marginTop: 8 } },
          h('button', { className: 'pill pill-blue', onClick: (e) => { e.stopPropagation(); setEtapaModal(et); } }, 'Editar'),
          h('button', { className: 'pill pill-red', onClick: (e) => { e.stopPropagation(); handleDeleteEtapa(et.id); } }, 'Eliminar')
        )
      )),
      etapaModal !== null ? h(EtapaFaseFormModal, {
        title: etapaModal.id ? 'Editar Etapa' : 'Nueva Etapa',
        item: etapaModal, responsables: responsables,
        onClose: () => setEtapaModal(null), onSave: handleSaveEtapa
      }) : null
    );
  }

  return h(FasesView, {
    etapa: etapa, responsables: responsables,
    onBack: () => setEtapaId(null), showToast: showToast, refreshEtapas: loadEtapas
  });
}

function DashboardView({ empresa }){
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    const { data, error } = await sb.from('partidas_full').select('*').eq('empresa_id', empresa.id).order('fecha_termino');
    if(!error) setPartidas(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [empresa.id]);

  if(loading) return h('div', { className: 'text2' }, 'Cargando...');

  const atrasadas = partidas.filter(p => clientEstado(p) === 'atrasado');
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en7 = new Date(hoy.getTime() + 7 * 86400000);
  const proximas = partidas.filter(p => {
    if(!p.fecha_termino) return false;
    if(Number(p.avance_porcentaje) >= 100) return false;
    const term = new Date(p.fecha_termino + 'T00:00:00');
    return term.getTime() >= hoy.getTime() && term.getTime() <= en7.getTime();
  });

  return h('div', { className: 'gap10' },
    h('div', { className: 'grid2' },
      h('div', { className: 'card' },
        h('div', { className: 'card-title' }, 'Avance Global'),
        h('div', { className: 'card-val', style: { color: 'var(--blue)' } }, Math.round(empresa.avance_global || 0) + '%')
      ),
      h('div', { className: 'card' },
        h('div', { className: 'card-title' }, 'Partidas Atrasadas'),
        h('div', { className: 'card-val', style: { color: 'var(--red)' } }, atrasadas.length)
      ),
      h('div', { className: 'card' },
        h('div', { className: 'card-title' }, 'Próximas a vencer (7 días)'),
        h('div', { className: 'card-val', style: { color: 'var(--amber)' } }, proximas.length)
      ),
      h('div', { className: 'card' },
        h('div', { className: 'card-title' }, 'Total Partidas'),
        h('div', { className: 'card-val' }, partidas.length)
      )
    ),
    h('div', { className: 'shdr', style: { marginTop: 10 } }, h('div', { className: 'shdr-title' }, 'Carta Gantt')),
    partidas.length === 0 ? h('div', { className: 'card' }, h('div', { className: 'text2' }, 'Sin partidas registradas aún.')) : h('div', { className: 'gt-wrap' },
      h('table', { className: 'gt-table' },
        h('thead', null, h('tr', null,
          h('th', null, 'Partida'), h('th', null, 'Etapa / Fase'), h('th', null, 'Inicio'), h('th', null, 'Término'), h('th', { className: 'gt-bar-cell' }, 'Avance')
        )),
        h('tbody', null,
          partidas.map(p => {
            const estado = clientEstado(p);
            const color = estado === 'completado' ? 'var(--green)' : estado === 'atrasado' ? 'var(--red)' : 'var(--blue)';
            return h('tr', { key: p.id },
              h('td', null, p.nombre),
              h('td', { className: 'text2' }, p.etapa_nombre + ' / ' + p.fase_nombre),
              h('td', { className: 'mono' }, p.fecha_inicio || '—'),
              h('td', { className: 'mono' }, p.fecha_termino || '—'),
              h('td', { className: 'gt-bar-cell' },
                h('div', { className: 'gt-bar-wrap' },
                  h('div', { className: 'gt-bar-fill', style: { width: Math.round(p.avance_porcentaje) + '%', background: color } },
                    h('span', { className: 'gt-bar-pct' }, Math.round(p.avance_porcentaje) + '%')
                  )
                )
              )
            );
          })
        )
      )
    )
  );
}
