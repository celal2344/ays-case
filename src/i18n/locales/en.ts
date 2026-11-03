export const en = {
  app: { name: 'ays-case' },
  nav: {
    home: 'Home',
    menu: 'Menu',
    main: 'Main navigation',
    login: 'Sign in',
    orders: 'Orders',
    admin: 'Admin',
  },
  prefs: {
    theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System' },
    language: { label: 'Language' },
  },
  login: {
    title: 'Sign in',
    demoNote: 'Demo app: accounts come from DummyJSON.',
    username: 'Username',
    password: 'Password',
    submit: 'Sign in',
    fillAdmin: 'Fill admin',
    fillUser: 'Fill user',
    required: 'This field is required',
  },
  userMenu: {
    logout: 'Log out',
    role: { admin: 'Admin', moderator: 'Moderator', user: 'User' },
  },
  errors: {
    network: 'Cannot reach the server. Check your connection.',
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to do that.',
    notFound: 'We could not find what you asked for.',
    validation: 'The request was rejected.',
    server: 'The server had a problem. Please try again.',
  },
  orders: { title: 'Orders' },
  admin: { title: 'Admin' },
  feedback: {
    loading: 'Loading…',
    error: { title: 'Something went wrong', retry: 'Retry' },
    empty: { title: 'Nothing here yet' },
    notFound: {
      title: 'Page not found',
      body: 'The page you are looking for does not exist.',
      back: 'Back to home',
    },
    forbidden: {
      title: 'Admins only',
      body: 'You do not have permission to view this page.',
      back: 'Back to home',
    },
  },
}
