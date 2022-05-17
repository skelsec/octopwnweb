# Foreword
This project is in beta and has limitations so I'd advise keeping an eye on the browser's developer console.  
If you wish this project reach its full potential please support us on [Porchetta Industries](https://porchetta.industries).  
In case you already do, check the "For subscribers" section in this readme for additional goodies.

# How it works
Opening the webpage will download a python interpreter (pyodide) bundled with pentest tools check out the features
Yes, all these tools will be running inside of your browser and not reaching out to the internet. This static website can be hosted locally as well, not necessary to access it on the internet but this page will always ship the new updates when the underlying python libraries get an update.  
Most of these tools will require network access to the system, which (for obvious security reasons) the browser does not provide, hence a proxy application must be used.
At this point we differentiate between subscribers and non-subscribers for Porchetta industries.

## For subscribers
You will get the following
 - The proxy in three languages including source+compiled version
   - [Nim](https://gitlab.porchetta.industries/Skelsec/wsnetnim) - Native on many platforms, on Windows it compiles easily to DLL
   - [DOTNET](https://gitlab.porchetta.industries/Skelsec/wsnetframework) - Using .NET Framework, but supports .NET Core and Standard
   - [Python](https://github.com/skelsec/wsnet) - Contains both client and server code
 - The website source code [here](https://gitlab.porchetta.industries/Skelsec/octopwnweb)
 - Build environment for the pyodide core so you can rebuild everything yourself. Coming as soon as I can clear up the code

## Non-subscribers
 - You can use the Python version downloadable here [wsnet](https://github.com/skelsec/wsnet/)
 - I includied a compiled version as well for Windows 10 (64 bit)

# Features
 - Pentest tools in your browser
 - Updates shipped by hitting F5. 
 - We do the packaging for you.
 - The proxy binary rarely changes, reducing the need to replace existing deployments. (wink)
 - SMB client
 - LDAP client
 - Kerberos client
 - RDP client
 - VNC client
 - NetCat (raw TCP) client
 - Scanners scanners scanners
   - smb finger
   - smb share enum
   - smb interface enum
   - smb session enum
   - smb printnightmare enum (if I have time to add it)
 - built-in socks proxy chaining on top of the client-side proxy
 - pypykatz
   - lsass
   - registry
   - ntds.dit file parsing
   - other decryptors
 - dpapi decryptor (including wifi and chrome)
 - other utilities I forgot to add
 - interface allows 
 - it does logging and you can save/reload sessions
 - no wiki nor tutorials whatsoever, 0 test cases

# Usage
## Startup steps
 0. Read readme (recommended)
 1. Start your proxy app on localhost (optional). Without a working proxy only the file parsers and basic utils will work.
 2. Verify that proxy URL is pointing to the proxy. (optional)
 3. Click on the START button to load Pyodide framework -it might take a few 10s of seconds-.
 4. Type '?' for help.

## Usage -after startup-
There are 3 major categories of tools you can use in this framework: `Clients` `Scanners` `Utils`  
To use the clients and scanners you MUST add at least one Credential and one Target, optionally a proxy and a proxychain.  
IMPORTANT: Every time a proxy can be supplied, the default WSNET proxy must be supplied, or a proxychain that has the WSNET proxy as the first in the chain.
  - Credentials
    - `addcred` aliased `ac` command. Example: `ac TEST\\\\victim Passw0rd!`
    - `delcred` command. Example: `delcred 0` Removes the credential ID `0`
  - Targets
    - `addtarget` aliased `at`. Example: `at 10.10.10.2`
    - `deltarget` Example: `deltarget 0` Removes target ID `0`
  - Proxy
    - `addproxy` aliased `ap`. Example: `ap socks5 127.0.0.1 1080` Adds a SOCKS5 proxy
  - Proxychain  
    Allows you to chain multiple proxyies together. You must have proxies defined first, then create an empty chain, then add proxies to the chain
    - `createchain` Example: `createchain` Creates an empty chain
    - `addproxychain` Example: `addproxychain 0 5` Adds proxy ID `5` to proxychain ID `0`
  - Clients
   To use a client you must first add at least one Credential, one Target and optionally one Proxy.
   Currently the following clients supported: SMB/LDAP/KERBEROS
    - `createclient` aliased `cc`. Will spawn a new tab. Example: `cc SMB NTLM 4 5 6` Creates SMB client with NTLM authentication using credential `4` target `5` proxy/proxychain `6`
  - Scanner
   Please don't make me document this. there is a help menu. command structure is similar to that of metasploit 
  - Utils
   Utils do not need any parameters and can be used without a proxy. They can be created with the `createutil` aliased `cu` command. Example: `cu pypykatz`
   - PYPYKATZ
      LSASS/Registry/ntds.dit parsing and other tools.
      It gets automatically started, but you can create more. Example: `cu pypykatz`
   - DPAPI
      DPAPI secrets decryption. Example: `cu dpapi`
 
## Hints
 - FILES tab
   - Uploaded files are stored in-memory, and will disappear when reloading this page.
   - Stored files can be accessed by the built-in utilities using the `/volatile` mount path.
   - The max size of the /volatile mount point depends on your RAM
   - The `/static` mount point is backed by the non-volatile LocalStorage
   - The size of `/static` depends on your browser settings (it's a few Mb by default)
   - Sometimes you'd need to click REFRESH it manually.
 - CREDENTIALS tab
   - Lists stored credentials which can be used in all clients and scanners
   - Special characters like `\\` must be escaped with `\\`
   - Currently they are displayed in a truncated format, don't be afraid of not seeing the middle part
 - Octopwn web framework
   - It runs in your browser. No data should go in/out to the internet after loading.
   - Consists of static files only and can be easily hosted on-perm as well.
   - The tabs in this layout are dynamic. Hold click on tab name and move it around.
   - The default Pyodide console (python console) can be accessed at `/console.html`
 - About browsers
   - For some reason the framework runs on Chrome much faster than others
   - Functionalities were tested on FireFox


# Known limitations
 0. Yes, we are searching for someone who speaks HTML/JS and can make the website looking better :)
 1. File-related operations are provided by BrowserFS. This means you have many backend options, but all of them come with certain limitations.  
    If using memory-backed filesystem then you loose your data when reloading the page. if you are using localstorage backed fs, you will run into out-of-diskspace errors.
 2. Operations are generally slower (due to the many layers of virtualizations) and browser might hang during extreme cases (see next point)
 3. Pyodide has an issue where reloading the page many times causes out-of-memory error. (crashing the browser even)

# Kudos
- The entire Pyodide dev team. This project couldn't exist without you.
- Supporters on Porchetta.