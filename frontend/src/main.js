import { router } from './utils/router';
import { login } from './pages/login';
import { register } from './pages/register';
import { guestCheck } from './utils/guest-check';
import { getCookieMap } from './utils/cookie';
import { home } from './pages/home';
import { bootstrap } from './core/bootstrap';
import { mypage } from './pages/mypage';
import { userCheck } from './utils/user-check';
import { articlesNew } from './pages/articles/new';
import { learningMustache } from './pages/learning/mustache';
import { articlesId } from './pages/articles/id';

bootstrap(
  router(
    [
      { path: '/', fn: home },
      { path: '/mypage', fn: userCheck(mypage) },
      { path: '/articles/new', fn: userCheck(articlesNew) },
      { path: '/articles/:id', fn: articlesId },
      { path: '/register', fn: guestCheck(register) },
      { path: '/login', fn: guestCheck(login) },
      { path: '/learning/mustache', fn: learningMustache },
    ],
    {
      onNotFound: () => console.log('NOT FOUND'),
      onAfter: () => {
        const bodyClassList = document.body.classList;
        const isLoggedin = Boolean(getCookieMap().get('user.id'));
        bodyClassList.add(isLoggedin ? 'is-loggedin' : 'is-guest');
        bodyClassList.remove(isLoggedin ? 'is-guest' : 'is-loggedin');
      }
    }
  )
);
