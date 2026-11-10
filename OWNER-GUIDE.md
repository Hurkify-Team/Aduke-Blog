# Owner publishing guide

Open http://localhost:3000/admin while developing locally. On the live website, use `/admin` on the public domain.

## First-time access

Create the owner password on localhost and keep it in a password manager. Initial account setup is disabled on Vercel. When using Supabase, configure it locally first so the account is created in the same database used by the live blog. See DEPLOYMENT.md. No owner password has been created by the development agent.

## Publish a story

1. Choose **New post**. Add the title, category, author, short excerpt and full story.
2. Upload an approved JPG, PNG or WebP cover of up to 3 MB. Add a description of what the photograph shows. A cover is recommended; its description is required when a cover is attached.
3. Write directly in the visual editor. Select text and use Bold, Italic, Underline or Strikethrough. Choose Normal text, Heading, Subheading or Minor heading from the style menu. Use the alignment buttons for left, centre, right or justified text; use the list and quote buttons as needed. Undo and redo are available. Keyboard shortcuts include Ctrl+B, Ctrl+I, Ctrl+U and Ctrl+Z.
4. Use **Insert or edit link** to add a full `https://`, `http://` or `mailto:` address to selected text. Use **Insert image**, describe the photograph, then **Upload and insert image** to place images within the article (JPG/PNG/WebP, up to 3 MB). Select an image and press Delete to remove it; select it and reopen the image panel to update its description. Use **Clear text formatting** to remove formatting from the selected text. Add a YouTube URL if the story includes a video. The full article and excerpt should use your original, verified reporting.
5. Use **Save draft** to save privately. The publishing checklist explains which required fields remain. Use **Save & preview** to inspect the saved story.
6. Optionally select **Feature on the homepage** or **Add to Trending Stories**. Only one published article occupies the main hero; a new featured publication replaces the previous selection.
7. Choose **Publish post** when ready. Open **View published story** to review the public result. On a published story, **Save changes** updates the live article; **Unpublish** returns it to a private draft.

## Manage stories

- Search the library by title; use All, Published, Drafts or Archived tabs.
- **Duplicate** copies the saved story into a new unsaved draft, with a new URL and homepage placements cleared. Unsaved edits are not included.
- **Archive story** hides it from readers, the homepage and sitemap. Content remains saved. **Restore to drafts** makes it editable again without automatically publishing it.
- A changed published URL redirects readers from the old URL. Keep published URLs stable where possible.
- If another window saved the story first, reload it before saving your changes. This prevents silently overwriting newer edits.
- Unsaved text can be recovered within the current browser tab after refresh. This is a recovery aid, not a server backup. Save drafts regularly. Sign-out clears the browser recovery copy.
- **Account settings** lets you change your password and signs out other sessions. Email-based password reset is not yet available.

No posts are automatically written or published. The public homepage retains its original design. Live production publishing requires the configured persistent storage described in DEPLOYMENT.md.

Previously saved text-only stories remain supported and open in the visual editor. Formatting a legacy story converts that story to the structured rich-text format when saved; it does not alter the other stored stories. Formatting, links and inline image references are validated by the server. Raw HTML and externally hosted image embeds are not accepted.


## Import a news link
In `/admin`, open **Import a news link**, paste the public article URL and choose **Preview source**. Read the original before generating. Choose **Generate original draft** to put a concise, independently phrased brief into the editor with its source attribution. Review the facts and notes, add a photograph you have permission to use, then save privately or publish yourself. Generation never publishes automatically. Publisher login/paywall, reuse and robots restrictions can make a URL unsupported.

Rewriting is ready to configure later: set `GEMINI_API_KEY` privately in `.env.local` (locally) or your hosting environment, then restart/redeploy. `GEMINI_IMPORT_MODEL` defaults to `gemini-3.5-flash-lite`. Use a Google AI Studio project on the Free tier without paid billing; free quota limits apply. Paid projects can incur charges. Never put the key in browser code or commit it. Source preview works without a key. Generating sends extracted public article text to Google Gemini. Google may use free-tier inputs and outputs to improve its products.

The importer writes short source-linked briefs rather than reproducing full articles. Attribution does not grant copyright permission, anonymity or image rights. It downloads a source photograph only when you explicitly select it and confirm reuse permission. Source attribution is retained across saved edits and duplicated stories.


### Create your free-tier Gemini key
1. Sign in at https://aistudio.google.com/api-keys and accept the terms.
2. Choose Create API key; select or create a project, for example Aduke Blog. Confirm that project is on the Free tier. Do not enable paid billing if you want no paid usage.
3. Put the key privately in `.env.local` in the project root: `GEMINI_API_KEY=your_key_here`. Add `GEMINI_IMPORT_MODEL=gemini-3.5-flash-lite`. Never edit node_modules or put the real key into .env.example.
4. Restart with `npm.cmd run dev`. In `/admin`, open Import a news link, preview a URL and generate a draft.
5. A 429 response means rate/quota limits; wait and consult AI Studio usage. Key creation does not guarantee a particular free quota or regional/model availability.
Official setup: https://ai.google.dev/gemini-api/docs/api-key
Current pricing: https://ai.google.dev/gemini-api/docs/pricing


### Photographs from imported articles
Preview source now shows the detected lead photograph when a supported public image is available. Leave it unchecked to upload your own or use the Wikimedia Commons search link. To use the source photograph, select it, confirm that you have permission/a suitable licence, and enter the photographer/source and any required licence credit. Generated drafts include a local copy and a public photo-credit link. Source photographs are never sent to Gemini or edited to claim copyright clearance. The checkbox is your editorial confirmation, not automated rights verification. Check the image description and credit in the editor before publishing. Replacing/removing the cover clears its previous photo credit.


## Turn a public video into a story
Open **Import a story or video**, choose **Video / social post**, and paste the original post URL. Public YouTube watch, Shorts and youtu.be links can be passed directly to Gemini. For other platforms (including Instagram, Facebook, TikTok and X), attach an MP4, MOV or WebM clip you may submit, up to 3 MB. This does not bypass logins or download restricted platform media.

Optionally provide the original creator/account, a working title and the caption/background notes. Confirm you may submit the video for analysis, select **Preview source**, then **Analyse video & write story**. Preview validates inputs; generation sends the video to Google Gemini and examines up to the first 180 seconds, including available audio. It writes a longer story only when the video supports it, with source attribution and timestamped editorial review notes. Captions and speaker claims are not independent verification. Check names, dates, locations and allegations yourself.

Video generation uses your existing Gemini key and model and is subject to Google's free-tier availability and quotas. Uploaded clips are processed in memory, sent to Gemini, and not saved/rehosted by this blog. A direct public YouTube source is added to the existing YouTube embed field; uploaded social clips are linked through their original source attribution and are not publicly embedded. Covers still need a permitted photograph. Drafts are not automatically saved or published.

Official video API documentation: https://ai.google.dev/gemini-api/docs/generate-content/video-understanding


## Create a category
Sports is included as a default category. In the editor's **Details** section, open **Create a category**, enter a name and select **Add**. It is saved for future stories and selected for the current post. Publish posts normally; categories appear in the public topic filters and extra topics are listed under **More**. Gemini imports can choose from your saved categories. Case/whitespace duplicates reuse the existing category. Categories are stored alongside your articles in local or configured Supabase storage; include `categories.json` in filesystem backups.


## Artist Spotlight
In the post editor, choose **Publishing ? Homepage placement ? Artist Spotlight**. The editor selects Music as its category. Add a permitted artist cover photograph, write the headline, excerpt and full article, then publish. The spotlight appears as the main homepage feature and links to that article. Only one main feature appears at a time; publishing a different spotlight or featured story replaces it. Choosing Regular story removes that story from the main feature. A draft is not shown publicly.

## Newsroom accounts and team access
The existing owner now signs in at `/admin` with username **owner** and the same password as before. Existing owner sessions remain valid. Coworkers never need the owner's password.

The owner opens **Team access**, enters a coworker's name and unique username, and chooses Editor or Author. **Create setup link** produces a private, one-use link valid for 7 days. Copy it and share it directly with that coworker; the app does not send email. The recipient sets a password of at least 12 characters and is signed in automatically. Afterwards they use their own username/password at `/admin`.

- Owner: manages accounts, publishing, categories and all stories.
- Editor: manages/publishes stories and categories, including Artist Spotlight, but cannot manage accounts.
- Author: creates/edits/previews their own unpublished drafts and uses imports/uploads. Editors/owner review and publish them. Authors cannot view another writer's private drafts, publish, change homepage placement, or modify a published story.

The owner can disable access, enable activated accounts, change roles or issue a replacement setup link. Disabling, changing a role or replacing a setup link invalidates that coworker's existing sessions. A replacement setup link requires setting a new password before signing in again. Disabling an account leaves its stories intact. Password changes and sign-out revoke that account's other sessions without signing out the rest of the team.

Accounts and invitation hashes are stored in the existing private newsroom state (`team.json` locally or the Supabase state). Plain invitation tokens and passwords are not stored. Do not post setup links publicly. Owner password recovery still requires your secure recovery procedure; automatic recovery email is not provided.


## Owner recovery and coworker accounts
The single owner signs in under Blog owner using the original password. Team member sign-in uses each invited coworker's username and password. From Team access, the owner creates an Editor or Author invitation and privately shares its single-use setup link. Authors submit drafts; Editors review and publish. Invitations expire in seven days; the owner can disable accounts or reissue links.

If the owner password is forgotten, run npm run owner:recovery in the trusted project terminal (with the production Supabase environment configured). Open .owner-recovery-link.txt privately and follow its link within 30 minutes. Choose a new password to restore the same owner account. It rotates the owner's session secret, retains posts and colleagues, and invalidates the recovery link. No public endpoint can generate recovery links. Delete the private link file after use.

## Spotlight carousel
Select Artist Spotlight in a Music story's Homepage placement and publish with an approved cover photograph. Spotlight selections are retained when another slide is added. Up to five stories rotate every ten seconds. Selected Spotlight stories take priority; recent published Music stories with approved covers fill spare slots. With fewer than five eligible stories, fewer slides appear. Featured Story chooses the opening story. The carousel pauses on hover/focus and respects reduced motion. Text and images occupy separate columns, stacking on mobile.

## Nigeria and foreign news
The admin News radar defaults to Nigeria. Use Foreign news, Needs location review or All to switch. Location is inferred from the story's subject, not the outlet's country; ambiguous stories remain unclassified. This filter applies to cached leads and rewrite ideas, including older scans.
