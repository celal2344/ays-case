import type { en } from './en'

export const tr = {
  app: { name: 'ays-case' },
  nav: {
    home: 'Ana sayfa',
    menu: 'Menü',
    main: 'Ana gezinme',
    login: 'Giriş yap',
    orders: 'Siparişler',
    admin: 'Yönetim',
  },
  prefs: {
    theme: { label: 'Tema', light: 'Açık', dark: 'Koyu', system: 'Sistem' },
    language: { label: 'Dil' },
  },
  login: {
    title: 'Giriş yap',
    demoNote: 'Demo uygulama: hesaplar DummyJSON üzerinden gelir.',
    username: 'Kullanıcı adı',
    password: 'Şifre',
    submit: 'Giriş yap',
    fillAdmin: 'Yöneticiyi doldur',
    fillUser: 'Kullanıcıyı doldur',
    required: 'Bu alan zorunludur',
  },
  userMenu: {
    logout: 'Çıkış yap',
    role: { admin: 'Yönetici', moderator: 'Moderatör', user: 'Kullanıcı' },
  },
  errors: {
    network: 'Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.',
    unauthorized: 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
    forbidden: 'Bu işlem için yetkiniz yok.',
    notFound: 'İstediğiniz içerik bulunamadı.',
    validation: 'İstek reddedildi.',
    server: 'Sunucuda bir sorun oluştu. Lütfen tekrar deneyin.',
  },
  orders: { title: 'Siparişler' },
  admin: { title: 'Yönetim' },
  feedback: {
    loading: 'Yükleniyor…',
    error: { title: 'Bir şeyler ters gitti', retry: 'Tekrar dene' },
    empty: { title: 'Henüz burada bir şey yok' },
    notFound: {
      title: 'Sayfa bulunamadı',
      body: 'Aradığınız sayfa mevcut değil.',
      back: 'Ana sayfaya dön',
    },
    forbidden: {
      title: 'Yalnızca yöneticiler',
      body: 'Bu sayfayı görüntüleme yetkiniz yok.',
      back: 'Ana sayfaya dön',
    },
  },
} satisfies typeof en
