const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileBtn = document.querySelector('#new-file');
const openFileBtn = document.querySelector('#open-file');
const saveMarkdownBtn = document.querySelector('#save-markdown');
const revertBtn = document.querySelector('#revert');
const saveHtmlBtn = document.querySelector('#save-html');
const showFileBtn = document.querySelector('#show-file');
const openInDefaultBtn = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = '';

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = nodeDeps.ndMarked(markdown, { sanitize: true });
};

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    const isEdited = currentContent !== originalContent;
    renderMarkdownToHtml(currentContent);
    elcMods.invokeAtMain(['updateUserInterface', isEdited])
        .catch(err => console.error("user interface title not updated"));
    saveMarkdownBtn.disabled = !isEdited;
    revertBtn.disabled = !isEdited;
});

openFileBtn.addEventListener('click', () => {
    elcMods.invokeAtMain(['getFileFromUser'])
        .then((rsp) => {
            filePath = rsp.file;
            originalContent = rsp.content;
            markdownView.value = rsp.content;
            renderMarkdownToHtml(rsp.content);
        })
        .catch((err) => {
            console.log(err);
            alert("could not open the file using file explorer");
        });
});

newFileBtn.addEventListener('click', () => {
    elcMods.sendToMain('create-new-window');
});

saveHtmlBtn.addEventListener('click', () => {
    elcMods.invokeAtMain(['saveHtml', htmlView.innerHTML])
        .then((rsp) => { console.log(rsp); })
        .catch((err) => { console.error(err); });
});

saveMarkdownBtn.addEventListener('click', () => {
    elcMods.invokeAtMain(['saveFile', filePath, markdownView.value])
        .then((rsp) => { console.log(rsp); })
        .catch((err) => { console.error(err); });
});

revertBtn.addEventListener('click', () => {
    markdownView.value = originalContent;
    renderMarkdownToHtml(originalContent);
    const isEdited = false; // because we are reverting
    elcMods.invokeAtMain(['updateUserInterface', isEdited])
        .catch(err => console.error("user interface title not updated"));
    saveMarkdownBtn.disabled = !isEdited;
    revertBtn.disabled = !isEdited;
});

// drag and drop feature implementation
/**
 * show somewhere on the UI the name of the dropped file
**/
document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

const getDraggedFile = (event) => event.dataTransfer.items[0];
const getDroppedFile = (event) => event.dataTransfer.files[0];

const fileTypeIsSupported = (file) => {
    return ['text/plain', 'text/markdown'].includes(file.type);
};

markdownView.addEventListener('dragover', (event) => {
    const file = getDraggedFile(event);
    if (fileTypeIsSupported(file)) {
        markdownView.classList.add('drag-over');
    } else {
        markdownView.classList.add('drag-error');
    }
});

markdownView.addEventListener('dragleave', () => {
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});

markdownView.addEventListener('drop', (event) => {
    const file = getDroppedFile(event);
    if (fileTypeIsSupported(file)) {
        const reader = new FileReader();
        reader.onload = () => {
            originalContent = reader.result;
            markdownView.value = reader.result;
            renderMarkdownToHtml(reader.result);
        };
        reader.onerror = () => {
            console.error("could not read contents of the dropped file");
        };
        reader.readAsText(file);
    } else {
        alert ('Dropped file type is not supported');
    }
    markdownView.classList.remove('drag-over');
    markdownView.classList.remove('drag-error');
});