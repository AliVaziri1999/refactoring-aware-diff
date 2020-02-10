var fileMap = {};
var popup = document.createElement("div");
var currentPage = "";

function urlEqual(baseURL, reference) {
    return baseURL.split("#diff")[0] === reference.split("#diff")[0];
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.message) {
        case "data":
            if (urlEqual(request.url, currentPage)) {
                console.log("same page, skipping...");
                return;
            }
            currentPage = request.url.split("#diff")[0];

            console.log("DATA = ", request.data);
            request.data.refactorings.forEach(refactoring => {
                var beforeFile = fileMap[refactoring.before_file_name];
                var afterFile = fileMap[refactoring.after_file_name];
                addRefactorings(
                    beforeFile.ref,
                    `${afterFile.link}R${refactoring.after_line_number}`,
                    refactoring,
                    "L"
                );

                addRefactorings(
                    afterFile.ref,
                    `${beforeFile.link}L${refactoring.before_line_number}`,
                    refactoring,
                    "R"
                );
            });
    }
});

window.addEventListener("load", function() {
    popup.setAttribute("class", "diff-refector-popup");
    popup.innerHTML = `
        <button class="diff-refector-popup-close btn btn-sm btn-default">x</button>
        <p><b class="refactor-type"></b></p>
        <div class="refactor-content"></div>
        <a class="btn btn-sm btn-primary refactor-link" href="#">Go to block</a>
    `;

    popup.showDiff = function(element, type, diffHTML, interval) {
        popup.style.setProperty("display", "block");
        popup.querySelector(".refactor-content").innerHTML = diffHTML;
        popup.querySelector(".refactor-type").innerText = type;

        if (interval) {
            popup
                .querySelector(".refactor-link")
                .setAttribute("href", interval);
        }

        var offset = (popupPosition = popup.getBoundingClientRect().width) + 10;

        var pos = element.getBoundingClientRect();
        popup.style.setProperty("top", pos.top + "px");
        popup.style.setProperty("left", pos.left - offset + "px");
    };

    document.body.appendChild(popup);
    document
        .querySelector(".diff-refector-popup-close")
        .addEventListener("click", function() {
            popup.style.setProperty("display", "none");
        });

    var files = document.querySelectorAll(".file");
    files.forEach(file => {
        var header = file.querySelector(".file-info > a");
        var fileName = header.textContent;
        var link = header.getAttribute("href");

        console.log("File=" + fileName + " Link=" + link);

        fileMap[fileName] = {
            ref: file,
            link: link
        };
    });

    chrome.runtime.sendMessage({
        message: "fetch",
        url: document.location.href.split("#diff")[0]
    });
});

function addRefactorings(file, link, refactoring, side) {
    console.log("adding refactoring for ", refactoring);

    // right side (addiction)
    var lineNumber = refactoring.after_line_number;
    var selector = ".code-review.blob-code.blob-code-addition";

    // left side (deletion)
    if (side === "L") {
        lineNumber = refactoring.before_line_number;
        selector = ".code-review.blob-code.blob-code-deletion";
    }

    file.querySelectorAll(selector).forEach(line => {
        console.log("seraching for ", lineNumber, "side = ", side);
        if (!line.querySelector(`[data-line="${lineNumber}"]`)) {
            return;
        }

        var contentHTML;
        switch (refactoring.type) {
            case "RENAME":
                contentHTML = `<p>${refactoring.before_local_name} to ${refactoring.after_local_name}</p>`;
                break;
            case "MOVE":
                contentHTML = `<p>${refactoring.object_type} ${refactoring.before_local_name} moved.</p>`;
                contentHTML += `<p>Origin: ${refactoring.before_file_name}:${refactoring.before_line_number}</p>`;
                contentHTML += `<p>Destiny: ${refactoring.after_file_name}:${refactoring.after_line_number}</p>`;
                break;
        }

        console.log("found line!!!!");

        var button = document.createElement("button");
        button.setAttribute("class", "btn-refector");
        button.addEventListener("click", () => {
            popup.showDiff(
                button,
                `${refactoring.type} ${refactoring.object_type}`,
                contentHTML,
                link
            );
        });
        button.innerText = "R";
        line.appendChild(button);
    });
}
