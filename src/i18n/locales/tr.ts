import type { en } from './en'

export const tr = {
  app: { name: 'ays-case' },
  nav: { home: 'Ana sayfa', menu: 'Menü', main: 'Ana gezinme' },
  prefs: {
    theme: { label: 'Tema', light: 'Açık', dark: 'Koyu', system: 'Sistem' },
    language: { label: 'Dil' },
  },
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
