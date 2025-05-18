let typingArea = document.getElementById('typingArea')
let chatBox = document.getElementById('chatBox')
let typer = document.getElementById("typer")
let messagePreviewAvatar = document.getElementById("messagePreview-avatar")
let messagePreviewName = document.getElementById("messagePreview-name")
let avatarInput = document.getElementById("speakerEditForm-avatar")
let nameInput = document.getElementById("speakerEditForm-name")
let speakerEditPreview = document.getElementById("speakerEditPreview")
let scriptInput = document.getElementById("scriptInput")

let previesSpeaker = -1;
let previesContainer = '';

const speakerStorageKey = "speakers"
const scriptStorageKey = "script"

function sleep(s) {
    if (s <= 0) {
        return
    }
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

async function speak(id, name, avatar, content, typingTime) {
    if (id === previesSpeaker) {
        await sleep(0.2)
    }

    if (typingTime > 0) {
        toggleTyping(name)
    }

    let bubble = buildBubble(content);

    if (typingTime > 0) {
        await sleep(typingTime)
        toggleTyping(name)
    }

    let shouldScroll = isScrolledToBottom(chatBox)

    if (id != previesSpeaker) {
        let message = document.createElement("div")
        message.classList.add("message")
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


async function resolveCodeLine(speaker, codeLine) {
    if (codeLine.length <= 0) {return}
    if (codeLine.trim().startsWith("//")) {return}

    let funcName = codeLine.slice(0, codeLine.indexOf("("))
    let params = parseParams(codeLine.slice(codeLine.indexOf("(")))

    switch (funcName) {
        case "speak":
            await speak(params[0], speaker[params[0]].name, speaker[params[0]].avatar, params[1], params[2])
        case "wait":
            await sleep(params[0])
            break
        case "system":
            let shouldScroll = isScrolledToBottom(chatBox)
            let div = document.createElement("div")
            div.classList.add("systemMessage")
            div.innerText = params[0]
            chatBox.appendChild(div)
            if (shouldScroll) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            break
    }
}

async function startAnimation(speaker, actions) {
    chatBox.textContent = "";
    await sleep(1);

    for (let codeLine of actions.split("\n")) {
        await resolveCodeLine(speaker, codeLine)
    }

    await sleep(2);
    end()
}

async function play() {
    let speaker = JSON.parse(localStorage.getItem(speakerStorageKey))
    let script = scriptInput.value
    startAnimation(speaker, script);
}

for (let ele of document.querySelectorAll('.popup-bg')) {
    ele.addEventListener("click", (e) => {
        if (e.target != ele) return
        ele.style.display = "none"
    })
}

avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        const base64String = reader.result;
        messagePreviewAvatar.src = base64String
    };

    reader.readAsDataURL(file);
})

nameInput.addEventListener("input", () => {
    messagePreviewName.innerText = nameInput.value
})

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
        index ++
    }
}

document.getElementById("addSpeaker").addEventListener("click", () => {
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
})

scriptInput.value = localStorage.getItem(scriptStorageKey)

scriptInput.addEventListener("input", () => {
    localStorage.setItem(scriptStorageKey, scriptInput.value)
})

updateSpeakerPreview()

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

    let result = {
        speaker: speaker,
        script: script
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
        typeof result !== 'object' ||
        !('speaker' in result) ||
        !('script' in result)
    ) {
        alert("Invalid format in clipboard data");
        return;
    }

    localStorage.setItem(speakerStorageKey, JSON.stringify(result.speaker))
    localStorage.setItem(scriptStorageKey, String(result.script))
    updateSpeakerPreview()
    scriptInput.value = result.script
}