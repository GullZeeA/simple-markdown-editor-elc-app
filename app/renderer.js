const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileBtn = document.querySelector('#new-file');
const openFileBtn = document.querySelector('#open-file');
const saveMarkdownBtn = document.querySelector('#save-markdown');
const revertBtn = document.querySelector('#revert');
const saveHtmlBtn = document.querySelector('#save-html');
const showFileBtn = document.querySelector('#show-file');
const openInDefaultBtn = document.querySelector('#open-in-default');

const renderMarkdownToHtml = (markdown) => {
    htmlView.innerHTML = nodeDeps.ndMarked(markdown, { sanitize: true });
};

markdownView.addEventListener('keyup', (event) => {
    const currentContent = event.target.value;
    renderMarkdownToHtml(currentContent);
});

openFileBtn.addEventListener('click', () => {
    elcMods.invokeAtMain(['getFileFromUser'])
        .then((rsp) => {
            const fileContents = rsp;
            markdownView.value = fileContents;
            renderMarkdownToHtml(fileContents);
        })
        .catch((err) => {
            console.err(err);
            alert("could not open the file using file explorer");
        });
});

newFileBtn.addEventListener('click', () => {
    elcMods.sendToMain('create-new-window');
});
