# GitHub Guide

このファイルは、班開発で GitHub を使うための基本的な手順をまとめたものである。

本プロジェクトでは、基本的に以下の流れで作業する。

```text
clone
↓
branch を作成
↓
作業
↓
commit
↓
push
↓
Pull Request
↓
merge
```

## 基本ルール

- `main` ブランチに直接 push しない
- 作業するときは必ず自分用のブランチを作成する
- 作業が終わったら commit する
- commit した内容を GitHub に push する
- GitHub 上で Pull Request を作成する
- 確認後、`main` に merge する

## ブランチ名の例

ブランチ名は、自分が何を作業しているか分かる名前にする。

```text
feature/login
feature/start-stop
feature/ui
fix/server-error
docs/readme
```

個人名を入れてもよい。

```text
feature/chiba-server
feature/kubota-client
```

---

# 1. リポジトリを clone する

clone とは、GitHub 上のリポジトリを自分の PC にコピーすることである。

## ターミナルで clone する方法

GitHub のリポジトリページを開き、`Code` ボタンから URL をコピーする。

その後、ターミナルで以下を実行する。

```bash
git clone <リポジトリのURL>
```

例：

```bash
git clone https://github.com/ユーザー名/study-time-tracker.git
```

clone できたら、プロジェクトのフォルダに移動する。

```bash
cd study-time-tracker
```


---

# 2. 最新の状態を取得する

作業を始める前に、必ず `main` ブランチを最新の状態にする。
方法はターミナルで以下を実行する。
```bash
git pull
```


# 3. ブランチを作成する

作業するときは、`main` から新しいブランチを作成する。

## ターミナルの場合

```bash
git switch main
git pull origin main
git switch -c <ブランチ名>
```

例：

```bash
git switch -c feature/login
```


# 4. ファイルを編集する

作成したブランチ上でファイルを編集する。

現在どのブランチにいるか確認したい場合は、以下を実行する。

```bash
git branch
```

`*` が付いているものが現在のブランチである。

例：

```text
* feature/login
  main
```

---


---

# 6. commit する

commit とは、作業内容を一区切りとして保存することである。
たとえば、ログイン機能のうち、ユーザー名を保存する機能ができたら、feature/loginブランチ内で"feature : 名前保存"でコミットする。

## ターミナルの場合

まず、commit したいファイルを追加する。

```bash
git add .
```

その後、commit する。

```bash
git commit -m "コミットメッセージ"
```

例：

```bash
git commit -m "Add login function"
```


## commit メッセージの例

```text
Add login function
Add start and stop command
Fix server connection error
Update README
```

---

# 7. push する

push とは、自分の PC の commit を GitHub にアップロードすることである。
コミットだけでは、変更は自分のpc内でしか行われていない。pushをすることで全員に共有できる。

## ターミナルの場合

```bash
git push origin <ブランチ名>
```

例：

```bash
git push origin feature/login
```

初めて push するブランチの場合は、以下のように表示されることがある。

```bash
git push --set-upstream origin feature/login
```

その場合は、表示されたコマンドをそのまま実行する。


# 8. Pull Request を作成する

Pull Request とは、自分のブランチの変更を `main` に取り込んでもらうためのリクエストである。

## GitHub 上で作成する方法

```text
GitHub のリポジトリページを開く
↓
Pull requests
↓
New pull request
↓
base: main
compare: 自分のブランチ
↓
Create pull request
```

Pull Request のタイトルには、何をしたかを簡単に書く。

例：

```text
Add login function
```

説明欄には、変更内容を書く。

例：

```md
## 変更内容

- ログイン機能を追加
- ユーザー名を入力できるようにした
- ログイン後に start / stop を実行できるようにした
```

---

# 9. merge する

merge とは、別のブランチの変更を `main` に取り込むことである。

## GitHub 上で merge する方法

Pull Request の内容を確認し、問題がなければ以下を実行する。

```text
Merge pull request
↓
Confirm merge
```

merge した後は、不要になったブランチを削除してよい。

```text
Delete branch
```

## ターミナルで merge する方法

基本的には GitHub 上の Pull Request で merge する。

ターミナルで直接 merge する場合は、以下のようにする。

```bash
git switch main
git pull origin main
git merge <ブランチ名>
git push origin main
```

例：

```bash
git switch main
git pull origin main
git merge feature/login
git push origin main
```

ただし、班開発ではこの方法ではなく、Pull Request を使う方が安全である。

---

# 10. merge 後に自分の環境を更新する

誰かの Pull Request が merge された後は、自分の PC の `main` も更新する必要がある。

## ターミナルの場合

```bash
git switch main
git pull origin main
```

その後、新しい作業ブランチを作成する。

```bash
git switch -c feature/new-work
```

## GUI の場合

GitHub Desktop で `main` に切り替え、`Pull origin` を押す。

---

# 11. よく使うコマンド一覧

## 現在の状態を確認

```bash
git status
```

## ブランチ一覧を確認

```bash
git branch
```

## main に切り替える

```bash
git switch main
```

## 新しいブランチを作る

```bash
git switch -c <ブランチ名>
```

## 最新の main を取得する

```bash
git pull origin main
```

## 変更を commit する

```bash
git add .
git commit -m "メッセージ"
```

## GitHub に push する

```bash
git push origin <ブランチ名>
```

---

# 12. コンフリクトについて

コンフリクトとは、複数人が同じファイルの同じ場所を編集したときに、Git がどちらを採用すればよいか判断できない状態である。

コンフリクトが起きた場合、ファイル内に以下のような表示が出る。

```text
<<<<<<< HEAD
自分の変更
=======
相手の変更
>>>>>>> branch-name
```

この場合、必要な内容だけを残して、以下の記号を削除する。

```text
<<<<<<<
=======
>>>>>>>
```

修正後、再度 commit する。

```bash
git add .
git commit -m "Resolve conflict"
```

コンフリクトが起きた場合は、無理に進めず、班員に確認する。

---

# 13. 作業の基本手順

毎回の作業は、以下の流れで行う。

```bash
git switch main
git pull origin main
git switch -c feature/作業名
```

ファイルを編集する。

```bash
git status
git add .
git commit -m "作業内容"
git push origin feature/作業名
```

その後、GitHub 上で Pull Request を作成する。

---

# 14. 注意点

- `main` に直接 push しない
- 作業前に必ず `git pull origin main` を行う
- 1つのブランチでは、なるべく1つの機能だけを作業する
- commit メッセージは分かりやすく書く
- 分からないエラーが出たら、すぐに班員に共有する
- 他の人が作業しているファイルを大きく変更する場合は、事前に相談する

---

# 15. 本プロジェクトでの推奨手順

本プロジェクトでは、以下の方法で作業する。

```text
1. main を最新にする
2. 自分用の branch を作る
3. 作業する
4. commit する
5. push する
6. Pull Request を作る
7. 確認後 main に merge する
```

例：

```bash
git switch main
git pull origin main
git switch -c feature/chiba-server
```

作業後：

```bash
git add .
git commit -m "Add basic server"
git push origin feature/chiba-server
```
