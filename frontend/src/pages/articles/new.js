import mustache from 'mustache';
import html from '../../templates/articles/new.html?raw';
import { marked } from 'marked';  // MarkdownをHTMLに変換するためのライブラリ

export const articlesNew = () => {
  const app = document.querySelector('#app');
  app.innerHTML = mustache.render(html, {});

  const textarea = document.querySelector('#editor-textarea');
  const previewArea = document.querySelector('#preview-area');

  // テキストエリアの内容をプレビューに反映する関数
  const updatePreview = () => {
    const markdownText = textarea.value;
    const htmlContent = marked(markdownText);  // MarkdownをHTMLに変換
    previewArea.innerHTML = htmlContent;  // プレビューエリアに反映
  };

  // テキストエリアの入力が変更される度にプレビューを更新
  textarea.addEventListener('input', updatePreview);

  // 初期プレビューを設定
  updatePreview();

  // 保存ボタンのクリックイベント
  const saveButton = document.querySelector('#submit');
  saveButton.addEventListener('click', () => {
    // フォームからタイトルと本文を取得
    const title = document.querySelector('input[name="title"]').value;
    const body = textarea.value;

    // 保存するデータを構造化
    const articleData = {
      title: title,
      body: body
    };
    

    // APIにPOSTリクエストを送信
    fetch('/api/v1/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'  // リクエストの内容がJSONであることを指定
      },
      body: JSON.stringify(articleData)  // JSONとしてリクエストボディにデータを送る
    })
    .then(response => {
      if (response.ok) {
        alert('記事が保存されました');
      } else {
        alert('保存に失敗しました');
      }
    })
    .catch(error => {
      console.error('エラー:', error);
      alert('エラーが発生しました');
    });
  });
};
