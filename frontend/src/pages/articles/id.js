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
    fetch(`/api/v1/articles/${id}`, { method: 'GET' })
        .then(response => response.json())
        .then(json => {
            const app = document.querySelector('#app');
            // templates/articles/id.html を <div id="app"></div> 要素内に出力する
            app.innerHTML = mustache.render(html, {
                title: json.item.title,
                createdAt: json.item.createdAt,
                displayCreatedAt: function () {
                    const d = new Date(this.createdAt);
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const date = d.getDate();
                    return `${year}/${month}/${date}`;
                },
                updatedAt: json.item.updatedAt,
                displayUpdatedAt: function () {
                    const d = new Date(this.updatedAt);
                    const year = d.getFullYear();
                    const month = d.getMonth() + 1;
                    const date = d.getDate();
                    return `${year}/${month}/${date}`;
                },
                user: json.item.user,
                body: DOMPurify.sanitize(parse(json.item.body)),
            });
        });   
    // このページ /articles/:id から遷移する際に実行する処理
    return () => {
    };
};