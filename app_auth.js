function AuthScreen(){
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e){
    e.preventDefault();
    setError(''); setLoading(true);
    try{
      if(mode === 'login'){
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if(error) throw error;
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if(error) throw error;
        setError('Cuenta creada. Si tu proyecto pide confirmación de correo, revisa tu email antes de iniciar sesión.');
      }
    } catch(err){
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return h('div', { className: 'login' },
    h('form', { className: 'login-card', onSubmit: submit },
      h('div', { className: 'login-title' }, 'Obra'),
      h('div', { className: 'login-sub' }, mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'),
      h('div', { className: 'field' },
        h('label', null, 'Email'),
        h('input', { type: 'email', value: email, required: true, onChange: e => setEmail(e.target.value) })
      ),
      h('div', { className: 'field' },
        h('label', null, 'Contraseña'),
        h('input', { type: 'password', value: password, required: true, minLength: 6, onChange: e => setPassword(e.target.value) })
      ),
      error ? h('div', { className: 'err-msg' }, error) : null,
      h('button', { className: 'btn-primary', type: 'submit', disabled: loading }, loading ? '...' : (mode === 'login' ? 'Entrar' : 'Crear cuenta')),
      h('div', { className: 'login-sub', style: { marginTop: 14, cursor: 'pointer' }, onClick: () => setMode(mode === 'login' ? 'signup' : 'login') },
        mode === 'login' ? 'No tienes cuenta? Crear una' : 'Ya tienes cuenta? Inicia sesión'
      )
    )
  );
}

function App(){
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if(session === undefined){
    return h('div', { className: 'login' }, h('div', { className: 'login-sub' }, 'Cargando...'));
  }
  if(!session){
    return h(AuthScreen);
  }
  return h(MainApp, { userId: session.user.id, userEmail: session.user.email });
}
