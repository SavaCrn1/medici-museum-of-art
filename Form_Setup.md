# Sending website form messages to the museum's email

The website has four forms: **Contact Us**, **Book a Tour**, **Rentals** and **Subscribe**.
A free service called **Web3Forms** emails each message to whoever owns the website's
"access key". Right now that key belongs to the web developer, so messages go to the
developer's inbox.

To send them to the museum instead, you get the museum's own key and put it on the website
in place of the old one. It takes about 10 minutes. There is no account or password to set up.

---

## What you need

- The email address that should receive the messages (for example `info@medicimuseum.art`).
- Access to the website's GitHub page (`github.com/SavaCrn1/medici-museum-of-art`), signed in
  with a GitHub account that is allowed to make changes. If you don't have this, ask your web
  developer to add you.
- A computer (not a phone).

---

## Part 1: Get the museum's access key

1. Go to **https://web3forms.com**.
2. Find the box that asks for your email address. It is near the top of the page and is
   labelled something like "Create your Access Key".
3. Type the email address that should receive the messages.
4. Click **Create Access Key**.
5. Open that email inbox. Web3Forms sends a message containing the access key. **If you can't
   find it, check your spam or junk folder.**
6. Copy the access key. It is a long mix of letters, numbers and dashes, and it looks like this:
   `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

The key does not need to be kept secret. It can only send email *to* you.

---

## Part 2: Put the new key on the website

You only need to replace the old key with the new one. GitHub can do this in all the right
places at once.

**The old key is:**

```
40518d98-8e82-4a11-8840-93afa2b2eedc
```

1. Go to **https://github.dev/SavaCrn1/medici-museum-of-art**
   (that is *github.dev*, not github.com). Sign in if asked.
   A code editor opens in your browser. You don't need to understand what you see.
2. Open the **Replace** box:
   - **Windows:** press `Ctrl` + `Shift` + `H`
   - **Mac:** press `Cmd` + `Shift` + `H`
3. In the top box (**Search**), paste the **old key** shown above.
4. In the box under it (**Replace**), paste the museum's **new key**.
5. The list underneath should show **5 files**. Click the **Replace All** button (the small
   icon to the right of the Replace box). Click **Replace** if it asks you to confirm.
6. Save the changes:
   1. Click the **Source Control** icon in the left-hand bar. It looks like a branching line
      and may show the number 5.
   2. In the **Message** box at the top, type: `Send form messages to the museum`
   3. Click **Commit & Push**.

The website updates itself within about **2 minutes**.

---

## Part 3: Check that it works

1. Wait 2 minutes, then open the website's **Contact Us** page.
2. Send a short test message, for example "Test, please ignore".
3. Check the museum's inbox. The message arrives from **"Medici Museum of Art website"**,
   with a subject line saying which form it came from.

If nothing arrives within a few minutes, check the spam or junk folder. If it's in spam, mark
it **Not spam** so future messages go straight to the inbox.

---

## Good to know

- **One key covers all four forms.** You never need to do this per form.
- **Replying is easy.** When you press **Reply** on a form message, your reply goes to the
  visitor who filled in the form.
- **Free limit:** the free plan covers about **250 messages a month** across all four forms.
  If the museum ever needs more, Web3Forms sells a paid plan, and the key stays the same.
- **Changing the email again later:** repeat Part 1 with the new address, then Part 2. In
  Part 2, put the key that is *currently* on the site in the **Search** box, and the newest key
  in the **Replace** box.

---

*For a web developer:* the key lives in `formsKey` in `src/site.config.js`. Changing it there and
running `node build.js` updates the four form pages. The find-and-replace above does the same
thing without needing Node installed.
