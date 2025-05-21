let typingArea = document.getElementById('typingArea')
let chatBox = document.getElementById('chatBox')
let typer = document.getElementById("typer")
let messagePreviewAvatar = document.getElementById("messagePreview-avatar")
let messagePreviewName = document.getElementById("messagePreview-name")
let avatarInput = document.getElementById("speakerEditForm-avatar")
let nameInput = document.getElementById("speakerEditForm-name")
let speakerEditPreview = document.getElementById("speakerEditPreview")
let scriptInput = document.getElementById("scriptInput")
let lineNumbers = document.getElementById("lineNumbers")
let bannerAvatars = document.getElementById("userList").querySelectorAll(".userAvatar")
let jumpToInput = document.getElementById("jumpToInput")
let hintBox = document.getElementById("hintBox")
let emoteInput = document.getElementById("addEmote")

let playStopButton = document.getElementById("play-stop")
let pauseResumeButton = document.getElementById("pause-resume")

let previesSpeaker = -1;
let previesContainer = '';
let previesCursorLine = -1;
let pov = -1
let isPlaying = false
let isPausing = false

let lineNum = -1
let breakPoint = -1

let previesLineCount = 0;

const speakerStorageKey = "speakers"
const scriptStorageKey = "script"
const bannerStorageKey = "banner"
const emotesStorageKey = "emotes"
const settingVersion = "1.0"

const hints = {
    "speak": 
    `speak(speakerIndex, content, typingSeconds):
    Let a speaker say something
    speak(0, "Hello", 1)`,

    "system": 
    `system(content):
    Show a system message in chat
    system('"NEON" added "NEON" into "Casual Chat"')`,

    "setPOV":
    `setPOV(speakerIndex):
    Set a speaker as POV in this chat
    setPOV(2)`,

    "wait":
    `wait(seconds):
    Wait a few second before next line of script
    wait(1.5)`
};

function main() {
    scriptInput.value = localStorage.getItem(scriptStorageKey)

    updateScriptInput()
    updateSpeakerPreview()
    updateTitleFromStorage()
}

main()

function sleep(s, skip = false) {
    if (skip || s <= 0) return
    return new Promise(resolve => setTimeout(resolve, s*1000));
}

function toggleTyping(name) {
    typer.innerText = name
    typingArea.classList.toggle('hidden')
}

function isScrolledToBottom(ele) {
  return ele.scrollHeight - ele.scrollTop <= ele.clientHeight + 1;
}

function end() {
    let shouldScroll = isScrolledToBottom(chatBox)

    let wrapper = document.createElement("div")
    wrapper.classList.add("end-wrapper")

    let left = document.createElement("div")
    left.classList.add("end-line", "left")

    let text = document.createElement("div")
    text.classList.add("end-text")
    text.innerText = "All messages have been confirmed"

    let right = document.createElement("div")
    right.classList.add("end-line", "right")

    wrapper.appendChild(left)
    wrapper.appendChild(text)
    wrapper.appendChild(right)

    chatBox.appendChild(wrapper)

    if (shouldScroll) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function buildBubble(content) {
    let div = document.createElement("div")
    div.classList.add("bubble")
    div.innerText = content.replaceAll("\\n", "\n")
    return div
}

async function speak(id, name, avatar, content, typingTime, lineNum, skipWait = false) {
    if (id === previesSpeaker) {
        await sleep(0.2, skipWait)
    }

    if (typingTime > 0) {
        toggleTyping(name)
        await sleep(typingTime, skipWait)
        toggleTyping(name)
    }

    if (content === "") {return}

    let bubble = buildBubble(content);

    let shouldScroll = isScrolledToBottom(chatBox)

    if (id != previesSpeaker) {
        let message = document.createElement("div")
        message.classList.add("message")
        message.dataset.createdBy = lineNum
        chatBox.appendChild(message)
        
        let img = document.createElement("img")
        img.classList.add("avatar")
        img.src = avatar
        message.appendChild(img)

        let container = document.createElement("div")
        container.classList.add("container")
        message.appendChild(container)

        let userName = document.createElement("div")
        userName.classList.add("userName")
        userName.innerText = name
        container.appendChild(userName)

        previesContainer = container
        previesSpeaker = id

        if (id === pov) {
            message.classList.add("self-message")

            message.insertBefore(container, img);
        }
    }

    previesContainer.appendChild(bubble)

    if (shouldScroll) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }   
}

function parseParams(str) {
    str = str.trim()
    if (str.startsWith('(') && str.endsWith(')')) {
        str = "[" + str.slice(1, -1) + "]"
    } else {
        throw "params parse error"
    }
    return JSON.parse(str)
}

async function resolveCodeLine(speaker, codeLine, lineNum, skipWait = false) {
    if (codeLine.length <= 0) {return}
    if (codeLine.trim().startsWith("//")) {return}

    let funcName = codeLine.slice(0, codeLine.indexOf("("))
    let params = parseParams(codeLine.slice(codeLine.indexOf("(")))

    switch (funcName) {
        case "speak":
            await speak(params[0], speaker[params[0]].name, speaker[params[0]].avatar, params[1], params[2], lineNum, skipWait)
            break
        case "wait":
            await sleep(params[0], skipWait)
            break
        case "system":
            let shouldScroll = isScrolledToBottom(chatBox)
            let div = document.createElement("div")
            div.classList.add("systemMessage")
            div.dataset.createdBy = lineNum
            div.innerText = params[0]
            chatBox.appendChild(div)
            if (shouldScroll) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            break
        case "setPOV":
            if (pov !== -1) {
                alert("You should only setPOV once in a setting!")
                return
            }
            pov = params[0]
    }
}

async function waitUntilUnPause() {
    while (isPausing) {
        await sleep(0.1);
    }
    return;
}

async function startAnimation(speaker, actions, skipWait = false, breakLine = -1) {
    chatBox.textContent = "";
    previesSpeaker = -1;
    previesContainer = '';
    pov = -1;

    await sleep(1, skipWait);

    lineNum = 0

    for (let codeLine of actions.split("\n")) {
        if (!isPlaying) {
            return;
        }
        if (lineNum === breakLine) {
            isPausing = true
            pauseResumeButton.innerText = "Resume"
            skipWait = false
        }
        if (isPausing) {
            await waitUntilUnPause()
        }
        await resolveCodeLine(speaker, codeLine, lineNum, skipWait)
        lineNum ++
    }

    await sleep(2);
    end()
}

async function playOrStop(skipWait = false, breakLine = -1) {
    switch (playStopButton.innerText) {
        case "Play":
            let speaker = JSON.parse(localStorage.getItem(speakerStorageKey))
            let script = scriptInput.value
                .replace(/[\u2018\u2019\u201B\u201C\u201D\u00AB\u00BB]/g, '"')

            playStopButton.innerText = "Stop"

            pauseResumeButton.style.display = "inline-block"
            pauseResumeButton.innerText = "Pause"

            isPlaying = true
            isPausing = false

            await startAnimation(speaker, script, skipWait, breakLine);

            playStopButton.innerText = "Play"

            pauseResumeButton.style.display = "none"
            pauseResumeButton.innerText = "Pause"

            isPlaying = false
            break
        case "Stop":
            playStopButton.innerText = "Play"

            pauseResumeButton.style.display = "none"
            pauseResumeButton.innerText = "Pause"

            isPlaying = false
            break
    }
}

function pauseOrResume() {
    switch(pauseResumeButton.innerText) {
        case "Pause":
            isPausing = true
            pauseResumeButton.innerText = "Resume"
            break
        case "Resume":
            isPausing = false
            pauseResumeButton.innerText = "Pause"
            break;
    }
}

function buildSpeakerPreviewTr(index, name, avatar) {
    let tr = document.createElement("tr");

    let tdIndex = document.createElement("td");
    tdIndex.textContent = index;

    let tdName = document.createElement("td");
    let nameSpan = document.createElement("span");
    nameSpan.className = "userName";
    nameSpan.textContent = name;
    tdName.appendChild(nameSpan);

    let tdAvatar = document.createElement("td");
    let img = document.createElement("img");
    img.className = "avatar";
    img.src = avatar;
    tdAvatar.appendChild(img);

    let tdDelete = document.createElement("td");
    let deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.addEventListener("click", () => {
        deleteSpeaker(index);
    });
    tdDelete.appendChild(deleteButton);

    tr.appendChild(tdIndex);
    tr.appendChild(tdName);
    tr.appendChild(tdAvatar);
    tr.appendChild(tdDelete);

    return tr;
}


function deleteSpeaker(index) {
    let storded = JSON.parse(localStorage.getItem(speakerStorageKey))

    storded.splice(index, 1);

    localStorage.setItem(speakerStorageKey, JSON.stringify(storded))

    updateSpeakerPreview()
}

function updateSpeakerPreview() {
    let storded = localStorage.getItem(speakerStorageKey)

    speakerEditPreview.innerHTML = "<tr><th>Index</th><th>Name</th><th>Avatar</th><th>Delete</th></tr>"
    
    for (let a of bannerAvatars) {
        a.style.display = "none"
    }

    if (storded === null) {
        return
    }

    try {
        storded = JSON.parse(storded)
    } catch (err) {
        console.error(err)
        console.log({storded})
        if (confirm("Error occure when parsing storded speaker list! See dev console for more detail\nPress 'OK' if you want to clean the storded speaker list")) {
            localStorage.setItem(speakerStorageKey, '[]')
        } else {
            return
        }
    }

    let index = 0
    for (let speaker of storded) {
        speakerEditPreview.appendChild(buildSpeakerPreviewTr(index, speaker.name, speaker.avatar))
        if (index < 3) {
            bannerAvatars[index].src = speaker.avatar
            bannerAvatars[index].style.display = "inline-block"
        }
        index ++
    }

    let extra = index - 3
    if (extra > 0) {
        document.getElementById("extraPeople").innerText = `+${extra}`
    } else {
        document.getElementById("extraPeople").innerTex = ""
    }
}

function addSpeakerOnClick() {
    let storded = localStorage.getItem(speakerStorageKey)
    let newSpeaker = {
        name: messagePreviewName.innerText,
        avatar: messagePreviewAvatar.src
    }

    if (storded === null) {
        localStorage.setItem(speakerStorageKey, JSON.stringify([newSpeaker]))
    } else {
        try {
            storded = JSON.parse(storded)
        } catch (err) {
            console.error(err)
            console.log({storded})
            if (confirm("Error occure when parsing storded speaker list! See dev console for more detail\nPress 'OK' if you want to clean the storded speaker list")) {
                storded = []
            } else {
                return
            }
        }
        storded.push(newSpeaker)
        localStorage.setItem(speakerStorageKey, JSON.stringify(storded))
        document.getElementById("speakerEditForm").reset()
        messagePreviewAvatar.src = "assets/ph2.png"
        messagePreviewName.innerText = "Name"
    }

    updateSpeakerPreview()
}

function getCursorLine() {
    const pos = scriptInput.selectionStart;
    const textBeforeCursor = scriptInput.value.substring(0, pos);
    return textBeforeCursor.split('\n').length;
}

function updateScriptInput() {
    localStorage.setItem(scriptStorageKey, scriptInput.value);

    let lineContent = scriptInput.value.split("\n")[getCursorLine()-1]
    let funcName = lineContent.slice(0, lineContent.indexOf("("))
    let hint = hints[funcName]
    if (hint) {
        hintBox.innerText = hint
    } else {
        hintBox.innerText = ""
    }

    const lines = scriptInput.value.split("\n").length;
    if (previesLineCount === lines) return 

    if (lines - previesLineCount > 0) {
        for (let i = previesLineCount + 1; i <= lines; i++) {
            lineNumbers.innerHTML += `<span data-line="${i}" onclick="jumpToInput.value=${i};updateCodeLineHightlight()">${i}<br></span>`
        }
    } else {
        for (let i = previesLineCount; i > lines; i--) {
            lineNumbers.removeChild(lineNumbers.querySelector(`[data-line='${i}']`))
        }
    }

    jumpToInput.max = lines
    if (jumpToInput.value > lines) {
        jumpToInput.value = 0
    }
    previesLineCount = lines
}

scriptInput.addEventListener("scroll", () => {
    lineNumbers.scrollHeight = scriptInput.scrollHeight
})

async function extract() {
    let speaker = localStorage.getItem(speakerStorageKey)
    try {
        speaker = JSON.parse(speaker)
    } catch (err) {
        console.error(err)
        console.log({speaker})
        alert("Error occured when parsing speaker list, see dev console for more detail")
        return
    }

    let script = localStorage.getItem(scriptStorageKey)

    let title = localStorage.getItem(bannerStorageKey)
    try {
        title = JSON.parse(title)
    } catch (err) {
        console.error(err)
        console.log({title})
        alert("Error occured when parsing title banner, see dev console for more detail")
        return
    }


    let result = {
        version: settingVersion,
        speaker: speaker,
        script: script,
        title: title
    }

    result = JSON.stringify(result)

    await navigator.clipboard.writeText(result);

    alert("This setting has been copied to clipboard")
}

async function load() {
    if (!confirm("WARNING: This Option will override what you currently have, are you sure?\nPress 'Ok' to continue")) {
        return
    }
    let result = await navigator.clipboard.readText();

    try {
        result = JSON.parse(result)
    } catch (err) {
        console.error(err)
        console.log({result})
        alert("Error occured when parsing loaded setting, see dev console for more detail")
        return
    }

    if (
        !result ||
        typeof result !== 'object'
    ) {
        alert("Invalid format in clipboard data");
        return;
    }

    if (result.version != settingVersion) {
        if (!confirm(`The setting you're loading is from a older (or higher somehow) version of current website
            It's usually fine to load, but it might cause something unexpect to happend, do you want to continue?
            Current website version: ${settingVersion}
            Loading setting version: ${result.version}`)) {return}
    }

    localStorage.setItem(speakerStorageKey, JSON.stringify(result.speaker))
    updateSpeakerPreview()

    localStorage.setItem(scriptStorageKey, String(result.script))
    scriptInput.value = result.script

    localStorage.setItem(bannerStorageKey, JSON.stringify(result.title))
    updateTitleFromStorage()
}

function updateTitleFromInput() {
    let title = document.getElementById("bannerEdit-title").value
    let subtitle = document.getElementById("bannerEdit-subtitle").value
    document.getElementById("chatTitle").innerText = title
    document.getElementById("chatSubtitle").innerText = subtitle
    localStorage.setItem(bannerStorageKey, JSON.stringify({title: title, subtitle: subtitle}))
}

function updateTitleFromStorage() {
    let banner = localStorage.getItem(bannerStorageKey)
    if (!banner) {return}
    banner = JSON.parse(banner)

    document.getElementById("bannerEdit-title").value = banner.title || "Title"
    document.getElementById("bannerEdit-subtitle").value = banner.subtitle || "SubTitle"

    updateTitleFromInput()
}

function avatarInputOnChange() {
    const file = avatarInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        const base64String = reader.result;
        messagePreviewAvatar.src = base64String
    };

    reader.readAsDataURL(file);
}

function updateEmotePreview() {
    let emotes = localStorage.getItem(emotesStorageKey)
    emotes = JSON.parse()
    for (let e of emotes) {
        
    }
}

function emoteInputOnChange() {
    const file = emoteInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        let emotes = localStorage.getItem(emotesStorageKey) || '[]'
        emotes = JSON.parse(emotes)
        emotes.push(reader.result)
        localStorage.setItem(emotesStorageKey, JSON.stringify(emotesStorageKey))
        updateEmotePreview()
        emoteInput.value = ""
    }

    reader.readAsDataURL(file);
}

function updateCodeLineHightlight() {
    let target = jumpToInput.value

    for (let span of lineNumbers.querySelectorAll("span")) {
        if (span.dataset.line === target) {
            span.classList.add("selected")
        } else {
            span.classList.remove("selected")
        }
    }
}

function jumpTo() {
    let breakLine = Number(jumpToInput.value)
    if (breakLine <= 0) {
        playOrStop()
    } else {
        playOrStop(true, breakLine)
    }
    
}
