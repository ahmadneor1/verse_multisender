# VERSE_MULTISENDER

This script is useful for those of you who want to collect tokens from various wallet accounts into one wallet account easily.

# Follow this step!

1. First, you need to clone this repo:
<pre lang="markdown">git clone https://github.com/ahmadneor1/verse_multisender.git</pre>
2. After that, go to the folder:
<pre lang="markdown">cd verse_multisender</pre>
3. Then, you need to install it:
   <pre lang="markdown">npm install</pre>
   or
   <pre lang="markdown">npm i</pre>
4. Create and fill file `mnemonic.txt`with your mnemonic code to check verse balance.

   If you want to do multi-sending directly, then create a file `sender.txt` with your sender mnemonic code and `destination.txt` with wallet address receiver!

5. Finally, you can run it:
   <pre lang="markdown">node check.js</pre> to check your balance
   and
   <pre lang="markdown">node send.js</pre> to send your tokens.

NOTED: Make sure that each account that will make the transfer has enough tokens for the gas fee!

# Prerequisites:

Make sure you have Node.js installed on your computer. If not, you can download it here: https://nodejs.org/en.
