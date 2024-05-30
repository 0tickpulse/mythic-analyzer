function mdSeeAlso(...paths: string[]) {
    return `\n\n## See Also\n\n${paths.map((path) => `* ${mdLinkWiki(path)}`).join("\n\n")}`;
}

function mdLinkWiki(path: string, text?: string) {
    const linkText = text || `Wiki: ${path.replace(/-/gu, " ")}`;
    return `[🔗 ${linkText}](https://git.lumine.io/mythiccraft/MythicMobs/-/wikis/${path})`;
}

export { mdSeeAlso, mdLinkWiki };
