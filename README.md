# NINE-Chat-Generator
Generate NINE Chat similar to the game Tribe Nine at https://huanget315.github.io/NINE-Chat-Generator/

See the [Settings](./Settings/) folder for some tutorials! Copy everything insde, then press the Load button, after everything is loaded press Play!

Their is also a tutorial video at https://youtu.be/ELf5mXja6QA

----
# Directory
- [All functions](#Functions)
    - [speak](##speak)
    - [wait](##wait)
    - [system](##system)
    - [setPOV](##setPOV)
- [Knowing Issues](#Knowing_Issues)
- [WIP](#WIP)
- [Ideas](#Ideas)
- [Version History](#Version_History)
    - [V 1.1](#V_1.1)

# Functions
## speak
> speak(speakerIndex, content, typingSeconds)
>
> // Example:
> 
> speak(3, "Hello there", 1)

| Parament | Type | Note |
| -------- | ------- | ------- |
| speakerIndex | integer | The index of the speaker |
| content | string | The thing they are going to say |
| typingSeconds | number | The time took them to type the content |

## wait
> wait(seconds)
>
> // Example:
> 
> wait(2)

| Parament | Type | Note |
| -------- | ------- | ------- |
| seconds | number | The time to wait in second |

## system
> system(content)
> 
> // Example:
>
> system("Zero remove Neon from this disguessing")

| Parament | Type | Note |
| -------- | ------- | ------- |
| content | string | The content of system message |

## setPOV
> setPOV(speakerIndex)
>
> // Example:
>
> setPOV(1)

| Parament | Type | Note |
| -------- | ------- | ------- |
| speakerIndex | number | The speaker you wish to be the POV (so their message will come from the right), can only set one speaker as pov |

# Knowing Issues
Issues I already know and will be fix soon
- Can't pause / end when playing
  
# WIP
Things I'm currently working on
- Export as video
  
# Ideas
Ideas I have but have no ideas how to, followed by the chance they actually come true
- Block programming like Scratch when creating animation (low)

# Version History
## V 1.1
- Added setPOV function
- Bug fix
