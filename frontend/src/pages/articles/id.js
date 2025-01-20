import mustache from 'mustache';
// Viteのルールとして、インポートする対象のファイルをそのまま取得するためには相対パスの末尾に"?raw"を付与する必要がある
// この場合、テンプレートのHTMLファイルをそのまま取得したいので"?raw"を末尾に付与している
// 参照: https://ja.vite.dev/guide/assets.html#importing-asset-as-string
import html from '../../templates/articles/id.html?raw';
// HTMLを無害化（サニタイズ）するライブラリをインポート
import DOMPurify from 'dompurify';
// Markdown形式の文字列をHTML形式の文字列にするライブラリをインポート
import { parse } from 'marked';
/**
 * 記事新規作成時の処理の関数
 */
export const articlesId = ({ id }) => {
    const app = document.querySelector('#app');
    // templates/articles/id.html を <div id="app"></div> 要素内に出力する
    app.innerHTML = mustache.render(html, {
        title: 'テストタイトル',
        createdAt: '2024-12-16T02:59:58.271Z',
        displayCreatedAt: function () {
            /* @todo 上の行にある createdAt の値をJSのDateオブジェクトを用いて
            2025/01/19 のようなフォーマットに変換した文字列をセット */
            console.log(this);
            return '2024/12/16';
        },
        updatedAt: '2024-12-16T02:59:58.271Z',
        displayUpdatedAt: function () {
            /* @todo 上の行にある updatedAt の値をJSのDateオブジェクトを用いて
            2025/01/19 のようなフォーマットに変換した文字列をセット */
            console.log(this);
            return '2024/12/16';
        },
        user: {
            id: '94fbd3f5-e175-4817-8da9-9ccac2a0a956',
            username: '@example',
        },
        body: '<h1>見出し</h1><p>テキストテキストテキスト</p>'
    });
    // このページ /articles/:id から遷移する際に実行する処理
    return () => {
    };
};