# SmartForm アイコン仕様

Chrome Web Store 公開用にアイコンが必要です。

## 必要なアイコンサイズ
- **icon16.png** - 16x16px (ツールバー)
- **icon32.png** - 32x32px (Windows)
- **icon48.png** - 48x48px (拡張機能管理画面)
- **icon128.png** - 128x128px (Chrome Web Store)

## デザインガイドライン

### 🎨 **デザインコンセプト**
- **テーマ**: フォーム入力の自動化・効率化
- **カラー**: ブルー系（信頼性）、グリーン系（効率性）
- **モチーフ**: フォーム、入力フィールド、自動化の象徴

### 💡 **デザイン案**
1. **フォームアイコン + 自動化**:
   - 四角いフォームの輪郭
   - 中に入力済みのチェックマーク
   - 小さな歯車やツールアイコン

2. **ペン + フォーム**:
   - 自動で書いているペンのイメージ
   - 背景にフォームのライン

3. **SF（SmartForm）**:
   - "SF" の文字をスタイリッシュに
   - 技術的な印象

### 🖼️ **作成方法オプション**

#### **オプション 1: AI画像生成**
- DALL-E、Midjourney、Stable Diffusion
- プロンプト例: "Chrome extension icon, form automation, blue and green colors, 128x128 pixels, clean design, form with checkmarks"

#### **オプション 2: デザインツール**
- Canva（テンプレート豊富）
- Figma（プロフェッショナル）
- GIMP（無料）

#### **オプション 3: 簡易版（SVG）**
```svg
<svg width="128" height="128" viewBox="0 0 128 128">
  <!-- 背景 -->
  <rect width="128" height="128" rx="20" fill="#1976d2"/>

  <!-- フォーム -->
  <rect x="24" y="32" width="80" height="64" rx="8" fill="white"/>

  <!-- 入力フィールド -->
  <rect x="32" y="40" width="64" height="8" rx="4" fill="#e0e0e0"/>
  <rect x="32" y="52" width="48" height="8" rx="4" fill="#4caf50"/>
  <rect x="32" y="64" width="56" height="8" rx="4" fill="#4caf50"/>

  <!-- チェックマーク -->
  <path d="M96 76 L104 84 L112 68" stroke="#4caf50" stroke-width="4" fill="none"/>
</svg>
```

## 📝 **次のステップ**

1. **アイコンを作成**（上記のいずれかの方法で）
2. **4つのサイズを生成**（16, 32, 48, 128px）
3. **ファイルを配置**:
   ```
   icons/
   ├── icon16.png
   ├── icon32.png
   ├── icon48.png
   └── icon128.png
   ```

4. **テスト**: Chrome拡張機能をリロードしてアイコンが表示されることを確認

## ⚠️ **注意事項**
- **著作権**: オリジナルデザインまたは商用利用可能な素材のみ使用
- **透明背景**: PNGファイルで背景は透明に
- **品質**: 各サイズで鮮明に表示されるようクオリティを確保