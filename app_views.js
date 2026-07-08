function BottomNav({ tab, setTab }){
  const tabs = [
    { id: 'empresas', label: 'Empresas', icon: '🏢' },
    { id: 'estructura', label: 'Estructura', icon: '🧱' },
    { id: 'responsables', label: 'Responsables', icon: '👤' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' }
  ];
  return h('div', { className: 'bnav' },
    tabs.map(t => h('button', {
      key: t.id,
      className: 'bnav-btn' + (tab === t.id ? ' on' : ''),
      onClick: () => setTab(t.id)
    },
      h('span', { className: 'bnav-icon' }, t.icon),
      h('span', null, t.label)
    ))
  );
}

function EmpresasList({ empresas, loading, onSelect, onEdit, onNew, onDelete }){
  return h('div', { className: 'gap10' },
    h('div', { className: 'shdr' },
      h('div', { className: 'shdr-title' }, 'Mis Obras'),
      h('button', { className: 'btn-primary', style: { width: 'auto', margin: 0, padding: '8px 14px' }, onClick: onNew }, '+ Nueva')
    ),
    loading ? h('div', { className: 'text2' }, 'Cargando...') : null,
    (!loading && empresas.length === 0) ? h('div', { className: 'card' }, h('div', { className: 'text2' }, 'Aún no tienes obras. Crea la primera con "+ Nueva".')) : null,
    empresas.map(emp => h('div', { key: emp.id, className: 'card' },
      h('div', { className: 'flex jb aic', style: { cursor: 'pointer' }, onClick: () => onSelect(emp.id) },
        h('div', null,
          h('div', { className: 'card-title' }, emp.tipo_construccion),
          h('div', { style: { fontSize: 17, fontWeight: 700 } }, emp.nombre)
        ),
        h('div', { className: 'card-val', style: { fontSize: 22, color: 'var(--blue)' } }, Math.round(emp.avance_global || 0) + '%')
      ),
      h('div', { className: 'bar', style: { marginTop: 10 } }, h('div', { className: 'bar-fill', style: { width: (emp.avance_global || 0) + '%', background: 'var(--blue)' } })),
      h('div', { className: 'flex g8', style: { marginTop: 10 } },
        h('button', { className: 'pill pill-blue', onClick: () => onEdit(emp) }, 'Editar'),
        h('button', { className: 'pill pill-red', onClick: () => onDelete(emp.id) }, 'Eliminar')
      )
    ))
  );
}

function EmpresaFormModal({ empresa, onClose, onSave }){
  const isNew = !empresa.id;
  const [nombre, setNombre] = useState(empresa.nombre || '');
  const [tipo, setTipo] = useState(empresa.tipo_construccion || 'Edificio');
  const [saving, setSaving] = useState(false);

  async function submit(e){
    e.preventDefault();
    if(!nombre.trim()) return;
    setSaving(true);
    await onSave({ id: empresa.id, nombre: nombre.trim(), tipo_construccion: tipo });
    setSaving(false);
  }

  return h('div', { className: 'modal-overlay', onClick: e => { if(e.target === e.currentTarget) onClose(); } },
    h('form', { className: 'modal', onSubmit: submit },
      h('div', { className: 'modal-title' }, isNew ? 'Nueva Empresa' : 'Editar Empresa', h('button', { type: 'button', className: 'modal-close', onClick: onClose }, '✕')),
      h('div', { className: 'field' },
        h('label', null, 'Nombre'),
        h('input', { value: nombre, onChange: e => setNombre(e.target.value), required: true, autoFocus: true })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Tipo de construcción'),
        h('select', { className: 'sel-input', value: tipo, onChange: e => setTipo(e.target.value) },
          ['Edificio', 'Casa', 'Departamento', 'Urbanización'].map(t => h('option', { key: t, value: t }, t))
        )
      ),
      h('button', { className: 'btn-primary', type: 'submit', disabled: saving }, saving ? 'Guardando...' : 'Guardar')
    )
  );
}

function ResponsableFormModal({ responsable, onClose, onSave }){
  const isNew = !responsable.id;
  const [nombre, setNombre] = useState(responsable.nombre || '');
  const [cargo, setCargo] = useState(responsable.cargo || '');
  const [contacto, setContacto] = useState(responsable.contacto || '');
  const [saving, setSaving] = useState(false);

  async function submit(e){
    e.preventDefault();
    if(!nombre.trim()) return;
    setSaving(true);
    await onSave({ id: responsable.id, nombre: nombre.trim(), cargo: cargo.trim(), contacto: contacto.trim() });
    setSaving(false);
  }

  return h('div', { className: 'modal-overlay', onClick: e => { if(e.target === e.currentTarget) onClose(); } },
    h('form', { className: 'modal', onSubmit: submit },
      h('div', { className: 'modal-title' }, isNew ? 'Nuevo Responsable' : 'Editar Responsable', h('button', { type: 'button', className: 'modal-close', onClick: onClose }, '✕')),
      h('div', { className: 'field' },
        h('label', null, 'Nombre'),
        h('input', { value: nombre, onChange: e => setNombre(e.target.value), required: true, autoFocus: true })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Cargo'),
        h('input', { value: cargo, onChange: e => setCargo(e.target.value) })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Contacto'),
        h('input', { value: contacto, onChange: e => setContacto(e.target.value) })
      ),
      h('button', { className: 'btn-primary', type: 'submit', disabled: saving }, saving ? 'Guardando...' : 'Guardar')
    )
  );
}

function ResponsablesView({ empresa, showToast }){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  async function load(){
    setLoading(true);
    const { data, error } = await sb.from('responsables').select('*').eq('empresa_id', empresa.id).order('nombre');
    if(!error) setItems(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [empresa.id]);

  async function handleSave(fields){
    if(fields.id){
      const { error } = await sb.from('responsables').update({ nombre: fields.nombre, cargo: fields.cargo, contacto: fields.contacto }).eq('id', fields.id);
      if(error){ showToast('Error: ' + error.message); return; }
    } else {
      const { error } = await sb.from('responsables').insert({ empresa_id: empresa.id, nombre: fields.nombre, cargo: fields.cargo, contacto: fields.contacto });
      if(error){ showToast('Error: ' + error.message); return; }
    }
    setModal(null); await load(); showToast('Guardado');
  }

  async function handleDelete(id){
    if(!window.confirm('¿Eliminar este responsable?')) return;
    const { error } = await sb.from('responsables').delete().eq('id', id);
    if(error){ showToast('Error: ' + error.message); return; }
    await load(); showToast('Eliminado');
  }

  return h('div', { className: 'gap10' },
    h('div', { className: 'shdr' },
      h('div', { className: 'shdr-title' }, 'Responsables'),
      h('button', { className: 'btn-primary', style: { width: 'auto', margin: 0, padding: '8px 14px' }, onClick: () => setModal({}) }, '+ Nuevo')
    ),
    loading ? h('div', { className: 'text2' }, 'Cargando...') : null,
    (!loading && items.length === 0) ? h('div', { className: 'card' }, h('div', { className: 'text2' }, 'Sin responsables registrados.')) : null,
    items.map(r => h('div', { key: r.id, className: 'card' },
      h('div', { className: 'flex jb aic' },
        h('div', null,
          h('div', { style: { fontWeight: 700 } }, r.nombre),
          r.cargo ? h('div', { className: 'resp-tag', style: { marginTop: 4, display: 'inline-block' } }, r.cargo) : null,
          r.contacto ? h('div', { className: 'text2', style: { fontSize: 12, marginTop: 4 } }, r.contacto) : null
        ),
        h('div', { className: 'flex g8' },
          h('button', { className: 'pill pill-blue', onClick: () => setModal(r) }, 'Editar'),
          h('button', { className: 'pill pill-red', onClick: () => handleDelete(r.id) }, 'Eliminar')
        )
      )
    )),
    modal !== null ? h(ResponsableFormModal, { responsable: modal, onClose: () => setModal(null), onSave: handleSave }) : null
  );
}

function EtapaFaseFormModal({ title, item, responsables, onClose, onSave }){
  const [nombre, setNombre] = useState(item.nombre || '');
  const [responsableId, setResponsableId] = useState(item.responsable_id || '');
  const [saving, setSaving] = useState(false);

  async function submit(e){
    e.preventDefault();
    if(!nombre.trim()) return;
    setSaving(true);
    await onSave({ id: item.id, nombre: nombre.trim(), responsable_id: responsableId || null });
    setSaving(false);
  }

  return h('div', { className: 'modal-overlay', onClick: e => { if(e.target === e.currentTarget) onClose(); } },
    h('form', { className: 'modal', onSubmit: submit },
      h('div', { className: 'modal-title' }, title, h('button', { type: 'button', className: 'modal-close', onClick: onClose }, '✕')),
      h('div', { className: 'field' },
        h('label', null, 'Nombre'),
        h('input', { value: nombre, onChange: e => setNombre(e.target.value), required: true, autoFocus: true })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Responsable'),
        h('select', { className: 'sel-input', value: responsableId, onChange: e => setResponsableId(e.target.value) },
          h('option', { value: '' }, '— Sin asignar —'),
          (responsables || []).map(r => h('option', { key: r.id, value: r.id }, r.nombre + (r.cargo ? ' (' + r.cargo + ')' : '')))
        )
      ),
      h('button', { className: 'btn-primary', type: 'submit', disabled: saving }, saving ? 'Guardando...' : 'Guardar')
    )
  );
}

function PartidaFormModal({ partida, responsables, onClose, onSave }){
  const isNew = !partida.id;
  const [nombre, setNombre] = useState(partida.nombre || '');
  const [sugerencias, setSugerencias] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(partida.fecha_inicio || '');
  const [fechaTermino, setFechaTermino] = useState(partida.fecha_termino || '');
  const [responsableId, setResponsableId] = useState(partida.responsable_id || '');
  const [avance, setAvance] = useState(partida.avance_porcentaje || 0);
  const [saving, setSaving] = useState(false);

  async function buscarCatalogo(term){
    setNombre(term);
    if(term.trim().length < 2){ setSugerencias([]); return; }
    const { data } = await sb.from('catalogo_partidas').select('nombre').ilike('nombre', '%' + term.trim() + '%').limit(8);
    setSugerencias(data || []);
    setShowSug(true);
  }

  async function submit(e){
    e.preventDefault();
    if(!nombre.trim()) return;
    setSaving(true);
    await onSave({
      id: partida.id,
      nombre: nombre.trim(),
      fecha_inicio: fechaInicio || null,
      fecha_termino: fechaTermino || null,
      responsable_id: responsableId || null,
      avance_porcentaje: Number(avance)
    });
    setSaving(false);
  }

  return h('div', { className: 'modal-overlay', onClick: e => { if(e.target === e.currentTarget) onClose(); } },
    h('form', { className: 'modal', onSubmit: submit },
      h('div', { className: 'modal-title' }, isNew ? 'Nueva Partida' : 'Editar Partida', h('button', { type: 'button', className: 'modal-close', onClick: onClose }, '✕')),
      h('div', { className: 'field', style: { position: 'relative' } },
        h('label', null, 'Nombre'),
        h('input', {
          value: nombre,
          onChange: e => buscarCatalogo(e.target.value),
          onFocus: () => setShowSug(sugerencias.length > 0),
          onBlur: () => setTimeout(() => setShowSug(false), 150),
          required: true,
          autoComplete: 'off'
        }),
        (showSug && sugerencias.length > 0) ? h('div', {
          className: 'card',
          style: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, padding: 6, maxHeight: 160, overflowY: 'auto' }
        },
          sugerencias.map(s => h('div', {
            key: s.nombre,
            className: 'editable',
            style: { display: 'block', padding: '6px 8px' },
            onClick: () => { setNombre(s.nombre); setShowSug(false); }
          }, s.nombre))
        ) : null
      ),
      h('div', { className: 'grid2' },
        h('div', { className: 'field' },
          h('label', null, 'Fecha inicio'),
          h('input', { className: 'date-input', type: 'date', value: fechaInicio, onChange: e => setFechaInicio(e.target.value) })
        ),
        h('div', { className: 'field' },
          h('label', null, 'Fecha término'),
          h('input', { className: 'date-input', type: 'date', value: fechaTermino, onChange: e => setFechaTermino(e.target.value) })
        )
      ),
      h('div', { className: 'field' },
        h('label', null, 'Responsable'),
        h('select', { className: 'sel-input', value: responsableId, onChange: e => setResponsableId(e.target.value) },
          h('option', { value: '' }, '— Sin asignar —'),
          (responsables || []).map(r => h('option', { key: r.id, value: r.id }, r.nombre + (r.cargo ? ' (' + r.cargo + ')' : '')))
        )
      ),
      h('div', { className: 'field' },
        h('label', null, 'Avance'),
        h('div', { className: 'pct-btns' },
          [0, 25, 50, 75, 100].map(pct => h('button', {
            key: pct, type: 'button',
            className: 'pct-btn' + (Number(avance) === pct ? ' sel' : ''),
            style: Number(avance) === pct ? { background: 'var(--blue)' } : null,
            onClick: () => setAvance(pct)
          }, pct))
        )
      ),
      h('button', { className: 'btn-primary', type: 'submit', disabled: saving }, saving ? 'Guardando...' : 'Guardar')
    )
  );
}
