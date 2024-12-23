/**
 * "/foo/bar" のようなパス文字列を ['foo', 'bar'] の配列形式に変換する
 * @param {string} str パス文字列
 * @returns スラッシュ記号単位で分割した配列
 */
const pathParse = (str) => str
  .split('/')
  .slice(1)
  .filter(Boolean);

/** @type { { path: string, fn: Function }[] } routes パスとパスにマッチした際に実行する関数をペアにしたオブジェクトリテラル */
let _routes = null;

/** 
 * @type { { onNotFound: Function, onBefore: () => any, onAfter: () => any } } on 
 * - onNotFound: どのパスにもマッチしなかった際の処理
 * - onBefore: 前処理
 * - onAfter: 後処理
 */
let _on = null;

/**
 * @type { null | (any) => any } current_target
 * クリーンアップ処理を受け取る箇所
 */
let _current_target = null;

/**
 * URLに応じて呼び出す関数を切り替えるルーターの初期化
 * @param { { path: string, fn: Function }[] } routes パスとパスにマッチした際に実行する関数をペアにしたオブジェクトリテラル
 * @param { { onNotFound: Function, onBefore: () => any, onAfter: () => any } } on 
 * - onNotFound: どのパスにもマッチしなかった際の処理
 * - onBefore: 前処理
 * - onAfter: 後処理
 */
export const router = (routes, on) => {
  _routes = routes;
  _on = on;
};

/**
 * 引数で渡されたパスが router (_routes) で定義されていたらそれを返却する関数
 * @param {string} url 遷移しようとしているURLパス
 * @returns パスの規則にマッチしているルートのオブジェクトリテラル
 */
export const findRoute = (url) => {
  /** @type { string[] } 現在アクセスしているURLを配列に加工したもの */
  const dir = pathParse(url);

  return _routes
    .filter(route => pathParse(route.path).length === dir.length)
    .map(route => {
      if (!'fn' in route) throw new Error('パスにマッチした際に実行する関数が定義されていません');

      /** 表示優先度 */
      let displayPriority = 0;
      /** @type { Map<string, string> } パスパラメーター（":"ではじまるもの）をセットするマップ */
      const pathParameterMap = new Map();
      /** @type { string[] } パスを配列に変換したもの */
      const path = pathParse(route.path);

      // トップページ（/）の場合の処理
      if (path.length === 0 && dir.length === 0) {
        displayPriority = 1;
      }

      for (let index = 0; index < dir.length; index++) {
        if (path[index].length > 1 && path[index].startsWith(':')) {
          displayPriority++;
          pathParameterMap.set(path[index].slice(1), dir[index]);
        }
        else if (dir[index] === path[index]) {
          displayPriority++;
        }
        else {
          displayPriority = 0;
          break;
        }
      }
      return { ...route, displayPriority, fn: route.fn.bind(route.fn, Object.fromEntries(pathParameterMap)) };
    })
    .filter(({ displayPriority }) => displayPriority)
    .sort(({ priority: a }, { priority: b }) => a === b ? 0 : (a < b ? 1 : -1))
    .at(0);
};

export const navigate = (url) => {
  // 別ページに遷移する際に行うクリーンアップ処理を実行する
  let fn = null;
  if (_current_target instanceof Promise) {
    fn = _current_target;
  } else {
    fn = Promise.resolve(_current_target);
  }

  fn
    .then(res => {
      if (typeof res === 'function') {
        res();
      }
    })
    .then(() => {
      document.querySelector('#app').innerHTML = '';
      if (location.pathname !== url) {
        history.pushState({}, '', url);
      }

      const { pathname } = location;
      const target = findRoute(pathname);

      // 前処理
      if (typeof _on.onBefore === 'function') {
        _on.onBefore();
      }
      // 本処理
      console.debug('Router target: %o', target);
      // URLにマッチする処理が定義されていたら
      if (target) {
        _current_target = target.fn();
      }
      // URLにマッチする処理がなくて onNotFound の処理が定義されていたら
      else if (typeof _on.onNotFound === 'function') {
        _on.onNotFound();
      }
      // いずれの処理も定義していない場合
      else {
        console.error('Target route not found.');
      }
      // 後処理
      if (typeof _on.onAfter === 'function') {
        _on.onAfter();
      }
    });
};
