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
let emoteInput = document.getElementById("addEmote")
let emotesPreview = document.getElementById("emotesPreview")
let commandListDiv = document.getElementById("commandList")

let playStopButton = document.getElementById("play-stop")
let pauseResumeButton = document.getElementById("pause-resume")
let jumpToButton = document.getElementById("jumpTo")

let previesSpeaker = -1;
let previesContainer = '';
let previesCursorLine = -1;
let pov = -1
let isPlaying = false
let isPausing = false

let lineNum = -1
let breakPoint = -1

let previousLineCount = 1;

const scriptInputCharsPerLine = getScriptInputCharsPerLine()

const speakerStorageKey = "speakers"
const scriptStorageKey = "script"
const bannerStorageKey = "banner"
const emotesStorageKey = "emotes"
const settingVersion = "1.0"

const commandList = {
    "Categories": [
        "Message",
        "Setting",
        "Control"
    ],
    "Commands": {
        "speak": {
            "category": "Message",
            "description": "Let a speaker send a text message",
            "paraments": {
                "speakerIndex": {
                    "type": "integer",
                    "description": "Index of the speaker",
                    "example": 0
                },
                "content": {
                    "type": "string",
                    "description": "Text the speaker are going to send",
                    "example": "Hello :D"
                },
                "typingSeconds": {
                    "type": "number",
                    "description": "Time took the speaker to type the content",
                    "example": 1
                }
            },
            "notes": "If <code>content</code> is an empty string, the speaker will type but not send the message<br>If <code>typingSeconds</code> is 0, the speaker will not type but directly send the message<br>If two message were send by a same speaker in a row, their will be a default 0.2 seconds wait time"
        },
        "emote": {
            "category": "Message",
            "description": "Let a speaker send a emote / image",
            "paraments": {
                "speakerIndex": {
                    "type": "integer",
                    "description": "Index of the speaker",
                    "example": 0
                },
                "emoteIndex": {
                    "type": "integer",
                    "description": "Index of the emote",
                    "example": 0
                }
            }
        },
        "system": {
            "category": "Message",
            "description": "Send a system message",
            "paraments": {
                "content": {
                    "type": "string",
                    "description": "Text content of the message",
                    "example": "\"Zero\" has left the chat"
                }
            }
        },
        "wait": {
            "category": "Control",
            "description": "Wait for a specific amount of time before moving to the next command",
            "paraments": {
                "seconds": {
                    "type": "number",
                    "description": "Time to wait in second",
                    "example": 1.5
                }
            }
        },
        "setPOV": {
            "category": "Setting",
            "description": "Set a speaker as POV of this chat, allowing their message to popup from right",
            "paraments": {
                "speakerIndex": {
                    "type": "integer",
                    "description": "Index of the speaker",
                    "example": 0
                }
            },
            "notes": "This command is ment to be used only once before the first message"
        }
    }
    
};

function getScriptInputCharsPerLine() {
    const style = getComputedStyle(scriptInput);
    const char = document.createElement('span');
    char.textContent = 'A';
    char.style.visibility = 'hidden';
    char.style.position = 'absolute';
    char.style.whiteSpace = 'pre';
    char.style.font = style.font;
    document.body.appendChild(char);

    const charWidth = char.getBoundingClientRect().width;
    document.body.removeChild(char);

    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const innerWidth = scriptInput.clientWidth - paddingLeft - paddingRight;

    console.log(innerWidth)
    console.log(charWidth)

    return Math.floor(innerWidth / charWidth);
}

main()

async function main() {
    scriptInput.value = localStorage.getItem(scriptStorageKey)
    
    for (let ele of document.querySelectorAll('.popup-bg')) {
        ele.addEventListener("click", (e) => {
            if (e.target != ele) return
            ele.classList.toggle("hidden")
        })
    }   

    updateScriptInput()
    updateSpeakerPreview()
    updateTitleFromStorage()
    updateEmotesPreview()
    buildCommandList()

    window.addEventListener("beforeunload", () => {
        localStorage.setItem(scriptStorageKey, scriptInput.value);
    })
}

function buildCommandContainerDiv(commandName, command) {
    let div = document.createElement("div")

    let syntax = commandName + "("
    let example = commandName + "("
    let table = document.createElement("table")
    table.style.borderCollapse = "collapse";
    table.classList.add("paramentTable")

    let tbody = document.createElement("tbody")
    tbody.innerHTML = "<tr><th>Parament</th><th>Type</th><th>Description</th></tr>"
    table.appendChild(tbody)

    for (let paraName of Object.keys(command.paraments)) {
        let para = command.paraments[paraName]
        tbody.innerHTML += `<tr><td><code>${paraName}</code></td><td><code>${para.type}</code></td><td>${para.description}</td></tr>`
        
        syntax += paraName + ", "

        if (typeof para.example === "string") {
            para.example = `"${para.example.replaceAll('"', '\\"')}"`
        }
        example += para.example + ", "
    }

    syntax = syntax.slice(0, -2) + ")"
    example = example.slice(0, -2) + ")"

    div.innerHTML += `<h1>${commandName}</h1>
    ${command.description}
    <br>
    <pre>${example}</pre>
    <h4>Paraments</h4>
    <pre>${syntax}</pre>
    ${table.outerHTML}`

    if (command.notes) {
        div.innerHTML += `<h4>Notes:</h4>${command.notes}`
    }

    return div
}

function buildCommandList() {
    for (let category of commandList.Categories) {
        let div = document.createElement("div")
        div.classList.add("commandList-category")
        div.dataset.category = category
        div.innerText = category
        commandListDiv.appendChild(div)
    }
    for (let commandName of Object.keys(commandList.Commands)) {
        let command = commandList.Commands[commandName]

        let commandDiv = document.createElement("div")
        commandDiv.classList.add("commandList-command")
        commandDiv.innerText = commandName
        
        let commandPopUpBg = document.createElement("div")
        commandPopUpBg.classList.add("popup-bg", "hidden")
        commandDiv.appendChild(commandPopUpBg)
        commandDiv.addEventListener("click", () => {commandPopUpBg.classList.toggle("hidden")})

        let commandPopUpContent = document.createElement("div")
        commandPopUpContent.classList.add("popup-content")
        commandPopUpContent.appendChild(buildCommandContainerDiv(commandName, command))
        commandPopUpBg.appendChild(commandPopUpContent)

        document.querySelector(`[data-category='${command.category}']`).appendChild(commandDiv)
    }

    for (let ele of document.querySelectorAll(".commandList-command")) {
        ele.addEventListener("mouseenter", () => {
            ele.style.backgroundColor = "#ececec";
        })
        ele.addEventListener("mouseleave", () => {
            ele.style.backgroundColor = "";
        })
    }
}

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

async function speakEmote(id, name, avatar, emote, lineNum, skipWait = false) {
    if (id === previesSpeaker) {
        await sleep(0.2, skipWait)
    }

    let emoteImg = document.createElement("img")
    emoteImg.classList.add("emote")
    emoteImg.src = emote

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

    previesContainer.appendChild(emoteImg)

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

async function resolveCodeLine(speaker, emotes, codeLine, lineNum, skipWait = false) {
    if (codeLine.length <= 0) {return}
    if (codeLine.trim().startsWith("//")) {return}

    let funcName = codeLine.slice(0, codeLine.indexOf("("))
    let params = parseParams(codeLine.slice(codeLine.indexOf("(")))

    switch (funcName) {
        case "speak":
            await speak(params[0], speaker[params[0]].name, speaker[params[0]].avatar, params[1], params[2], lineNum, skipWait)
            break
        case "emote":
            await speakEmote(params[0], speaker[params[0]].name, speaker[params[0]].avatar, emotes[params[1]])
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

async function startAnimation(speaker, emotes, actions, skipWait = false, breakLine = -1) {
    chatBox.textContent = "";
    previesSpeaker = -1;
    previesContainer = '';
    pov = -1;

    await sleep(1, skipWait);

    lineNum = 1

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
        await resolveCodeLine(speaker, emotes, codeLine, lineNum, skipWait)
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
            let emotes = JSON.parse(localStorage.getItem(emotesStorageKey))

            playStopButton.innerText = "Stop"

            pauseResumeButton.style.display = "inline-block"
            pauseResumeButton.innerText = "Pause"

            isPlaying = true
            isPausing = false

            await startAnimation(speaker, emotes, script, skipWait, breakLine);

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

function scriptInputOnChange() {
    localStorage.setItem(scriptStorageKey, scriptInput.value);
}

function updateScriptInput() {
    const linesArray = scriptInput.value.split("\n");
    const lines = linesArray.length;

    let gap = lines - previousLineCount
    let target = Number(jumpToButton.dataset.target)

    if (previousLineCount != lines) {
        if (gap > 0) {
            for (let i = previousLineCount + 1; i <= lines; i++) {
                lineNumbers.innerHTML += `<span data-line="${i}" onclick="updateCodeLineHightlight(${i})">${i}<br></span>`
            }
            if (getCursorLine() - gap < target) {
                updateCodeLineHightlight(String(target + gap))
            }
        } else {
            for (let i = previousLineCount; i > lines; i--) {
                lineNumbers.removeChild(lineNumbers.querySelector(`[data-line='${i}']`))
            }
            
            gap *= -1
            
            if (getCursorLine() + gap < target) {
                updateCodeLineHightlight(String(target - gap))
            }
        }
    }

    const spans = lineNumbers.querySelectorAll("span");
    spans.forEach((span, index) => {
        const textLine = linesArray[index] || "";
        const requiredBrCount = Math.max(0, Math.ceil(textLine.length / scriptInputCharsPerLine) - 1);

        const currentBrCount = span.querySelectorAll("br").length;

        if (currentBrCount < requiredBrCount + 1) {
            for (let i = 0; i < requiredBrCount + 1 - currentBrCount; i++) {
                span.appendChild(document.createElement("br"));
            }
        } else if (currentBrCount > requiredBrCount + 1) {
            const brs = span.querySelectorAll("br");
            for (let i = brs.length - 1; i >= requiredBrCount + 1; i--) {
                brs[i].remove();
            }
        }
    });

    previousLineCount = lines
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

    let emote = localStorage.getItem(emotesStorageKey)
    try {
        emote = JSON.parse(emote)
    } catch (err) {
        console.error(err)
        console.log({emote})
        alert("Error occured when parsing emote list, see dev console for more detail")
        return
    }

    let result = {
        version: settingVersion,
        speaker: speaker,
        emote: emote,
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

    localStorage.setItem(emotesStorageKey, JSON.stringify(result.emote||'[]'))
    updateEmotesPreview()
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
    banner = JSON.parse(banner) || {}

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

function deleteEmote(index) {
    let storded = JSON.parse(localStorage.getItem(emotesStorageKey))

    storded.splice(index, 1);

    localStorage.setItem(emotesStorageKey, JSON.stringify(storded))

    updateEmotesPreview()
}

function buildEmotesPreviewTr(index, base64Url) {
    let tr = document.createElement("tr");

    let tdIndex = document.createElement("td");
    tdIndex.textContent = index;

    let tdImg = document.createElement("td");
    let img = document.createElement("img");
    img.className = "emote";
    img.style.width = "75px";
    img.style.height = "75px";
    img.src = base64Url;
    tdImg.appendChild(img);

    let tdDelete = document.createElement("td");
    let deleteButton = document.createElement("button");
    deleteButton.textContent = "X";
    deleteButton.addEventListener("click", () => {
        deleteEmote(index);
    });
    tdDelete.appendChild(deleteButton);

    tr.appendChild(tdIndex);
    tr.appendChild(tdImg);
    tr.appendChild(tdDelete);

    return tr;
}

function updateEmotesPreview() {
    let emotes = localStorage.getItem(emotesStorageKey)
    emotesPreview.innerHTML = "<tr><th>Index</th><th>Emote</th><th>Delete</th></tr>"

    if (!emotes) {return}
    emotes = JSON.parse(emotes)
    
    for (let i = 0; i < emotes.length; i++) {
        emotesPreview.appendChild(buildEmotesPreviewTr(i, emotes[i]))
    }
}

function emoteInputOnChange() {
    const file = emoteInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        let emotes = localStorage.getItem(emotesStorageKey) || '[]'
        emotes = JSON.parse(emotes)
        emotes.push(reader.result)
        localStorage.setItem(emotesStorageKey, JSON.stringify(emotes))
        updateEmotesPreview()
        emoteInput.value = ""
    }

    reader.readAsDataURL(file);
}

function updateCodeLineHightlight(target = null) {
    target = String(target)
    if (target === jumpToButton.dataset.target) {
        jumpToButton.dataset.target = "0"
        target = "0"
    } else {
        jumpToButton.dataset.target = target
    }
        
    for (let span of lineNumbers.querySelectorAll("span")) {
        if (span.dataset.line === target) {
            span.classList.add("selected")
        } else {
            span.classList.remove("selected")
        }
    }
}

function jumpTo() {
    let breakLine = Number(jumpToButton.dataset.target)
    if (breakLine <= 0) {
        alert("Click on the number on the Code Line Display to mark that line as the target to Jump To")
    } else {
        playOrStop(true, breakLine)
    }
}

