function mdSeeAlso(...paths: string[]) {
    return `\n\n## See Also\n\n${paths.map((path) => `* ${mdLinkWiki(path)}`).join("\n\n")}`;
}

function mdLinkWiki(path: string) {
    return `[🔗 Wiki: ${path.replace(/-/g, " ")}](https://git.lumine.io/mythiccraft/MythicMobs/-/wikis/${path})`;
}

export { mdSeeAlso, mdLinkWiki };
