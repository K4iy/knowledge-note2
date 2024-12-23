import express from 'express';
import { constants as status } from 'node:http2';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import swagger from 'swagger-ui-express';
import yaml from 'yaml';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { hashSync, compareSync } from 'bcrypt';
import session from 'express-session';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const openapi = yaml.parse(fs.readFileSync('./src/openapi.yaml', 'utf8'));
const prisma = new PrismaClient();
/** 1時間のミリ秒 */
const _1h = 1000 * 60 * 60;

// Expressアプリケーションを作成
const app = express()
  // リクエストボディのJSONをパースするミドルウェア
  .use(express.json())
  .use(session({
    // 本来は secret というプロパティの通りでこの値は
    // サーバーの環境変数なりで、コードに残さない形にする
    secret: 'lk;w34$lfaJAfb',
    proxy: true,
    resave: true,
    saveUninitialized: true,
    cookie: {
      // https で常時接続するなら secure: true としたほうが良い
      // secure: true,
      httpOnly: true,
      // 1時間保持
      maxAge: _1h,
    },
  }))
  .use('/api/docs', swagger.serve, swagger.setup(openapi));

app.post('/api/v1/login', async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;
  await prisma.user
    .findFirstOrThrow({ where: { username } })
    .then(record => new Promise((res, rej) => compareSync(password, record.password)
      ? res(record)
      : rej()))
    .then(record => new Promise((res, rej) => {
      req.session.regenerate((err) => {
        if (err) return rej(err);
        return res(record);
      });
    }))
    .then(record => {
      console.debug(record);
      req.session.user = record;
      res.cookie('user.id', record.id, { maxAge: _1h });
      res.cookie('user.username', record.username, { maxAge: _1h });
      res.json({ message: 'OK' });
    })
    .catch(err => {
      console.error(err);
      res.status(status.HTTP_STATUS_BAD_REQUEST).json({ message: 'ログイン失敗: IDまたはパスワードが無効です。' });
    });
});

// ユーザー登録処理
app.post('/api/v1/register', async (req, res) => {
  console.log(req.body);
  const { email, password, username } = req.body;
  await prisma.user
    .create({
      select: {
        id: true,
        email: true,
        username: true,
      },
      data: {
        email,
        username,
        password: hashSync(password, 10),
      }
    })
    .then(record => new Promise((res, rej) => {
      req.session.regenerate((err) => {
        if (err) return rej(err);
        return res(record);
      });
    }))
    .then(record => {
      req.session.user = record;
      res.cookie('user.id', record.id, { maxAge: _1h });
      res.cookie('user.username', record.username, { maxAge: _1h });
      res.json({ isSuccess: true, message: 'OK' });
    })
    .catch(err => {
      console.error(err);
      res.status(status.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ isSuccess: false, message: '不明なエラーが発生しました' })
    });
});

app.post('/api/v1/user-update', async (req, res) => {
  console.log(req.body);
  // fetch関数で渡したデータをオブジェクトリテラルとして自動で変換してくれているので
  // username, email, passwordプロパティをそのまま変数として取得
  const { username, email, password } = req.body;
  /** DBにupdateをするためのオブジェクトリテラル */
  const data = {};
  // ユーザー名に変更入力があるなら
  if (username) {
    data.username = username;
  }
  // メールアドレスに変更入力があるなら
  if (email) {
    data.email = email;
  }
  // パスワードに変更入力があるなら登録時と同じ暗号化を実施して格納する
  if (password) {
    data.password = hashSync(password, 10);
  }
  // DBにupdateクエリを叩くような処理を実行
  await prisma.user.update({
    // where条件でuserテーブルのプライマリキーで変更したいユーザーを特定
    where: { id: req.session.user.id },
    // 変更したい内容をセット
    data: data,
  })
    .then(result => {
      // 正常にupdateクエリが成功したら
      req.session.user = result;
      res.json({ isSuccess: true, message: '保存成功' });
    })
    .catch(error => {
      // 何かしらの理由で処理が失敗してしまったら（エラーハンドリングと言う）
      console.error(error);
      res.status(status.HTTP_STATUS_BAD_REQUEST).json({ isSuccess: false, message: '保存失敗' });
    });
});

// ログアウト処理
app.get('/api/v1/logout', async (req, res) => {
  // ログイン状態を破棄する
  req.session.destroy();
  res.cookie('user.username', '', { maxAge: 0 });
  res.cookie('user.id', '', { maxAge: 0 });
  res.redirect('/');
});

// アクセスしてきたユーザーの登録情報を返却するAPI
app.get('/api/v1/user/me', async (req, res) => {
  const { user } = req.session;
  new Promise((resolve, reject) => {
    // サーバー上のセッションにユーザー情報が格納されているかのチェック
    if (user) {
      // ユーザーデータが含まれていたら、そのデータが正しいかDBに問い合わせてチェック
      resolve(user);
    } else {
      // この時点でセッションにデータが無ければ未ログインとしてエラー処理（.catch()）へ移動
      reject();
    }
  }).then(user => {
    // DBのuserテーブルを参照してアクセスしてきたユーザーが渡してきたCookieに
    // 紐づくサーバー上のセッション情報のIDが存在するか問い合わせを実行
    return prisma.user.findUniqueOrThrow({
      select: { id: true, username: true, email: true },
      where: { id: user.id }
    });
  }).then(record => {
    // ユーザーデータが正しく存在した場合
    // フロントエンド上でログインしているか判定をするためのCookieをセットする
    res.cookie('user.id', record.id, { maxAge: _1h });
    res.cookie('user.username', record.username, { maxAge: _1h });
    // ユーザー情報を返却する
    res.json({
      isSuccess: true,
      user: record,
    });
  }).catch(error => {
    // ログインしてない状態を返却
    console.error(error);
    // 念の為フロントエンドから渡されてきた無効なCookieを空文字で上書きする
    // maxAgeを0で返却すると、ブラウザ側で即時第一引数で指定したキーのCookieを即時クリアできる
    res.cookie('user.id', '', { maxAge: 0 });
    res.cookie('user.username', '', { maxAge: 0 });
    // 存在しなかったら400エラーを返却する
    res.status(status.HTTP_STATUS_BAD_REQUEST).json({
      isSuccess: false,
      message: 'Not login'
    });
  });
});

// 記事投稿処理をするAPI
app.post('/api/v1/articles', async (req, res) => {
  const { user } = req.session;
  // ログインしていなかったらエラーを返却
  if (!user) res.status(status.HTTP_STATUS_BAD_REQUEST).json({ isSuccess: false, message: 'Not login' });

  // POSTで送信したタイトルと
  const { title, body } = req.body;

  await prisma.article
    .create({
      data: {
        title,
        // 記事本文に有害な文字列が含まれていたらコンテンツを保存する前に問題のある箇所を切り捨てる
        body: DOMPurify.sanitize(body),
        user: { connect: { id: user.id } }
      }
    })
    .then(record => {
      res.json({ isSuccess: true, message: '保存成功', article: record });
    })
    .catch(error => {
      console.error(error);
      res.status(status.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ isSuccess: false, message: '保存失敗' })
    });
});

// サイトに登録されている記事を全て取得するAPI
app.get('/api/v1/articles', async (_, res) => {
  await prisma.article
    .findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    })
    .then(record => res.json({ isSuccess: true, items: record }))
    .catch(error => {
      console.error(error);
      res.status(status.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ isSuccess: false, message: '記事取得失敗' })
    });
});

// サーバーを起動
const PORT = 3000;
app.listen(PORT, () => console.debug(`Server is running on http://localhost:${PORT}`));
