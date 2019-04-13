function clearAllBgColors() {

    var elems = document.querySelectorAll('*[bgcolor]');

    if (elems.length === 0) {
        return setTimeout(clearAllBgColors, 100);
    }

    for (let elem of elems) {
        elem.setAttribute('bgcolor', '');
    }
}

// clear as quickly as possible.
clearAllBgColors();

// document.addEventListener('DOMContentLoaded', clearAllBgColors);



/**
 * Hackernews New/Seen/Read comments
 */
function processComments() {

    [].map.call(document.querySelectorAll('.comment:not(.processed)'), comment => {

        var replyUrl = comment.querySelector('.reply a').href;
        var replyId = replyUrl.match(/id=([0-9]+)/)[1];

        comment.parentNode.querySelector('.comhead').innerHTML += '<span>' + replyId + '</span>';

        var setSeen = function () {
            localStorage.setItem(seenKey, true);
            comment.classList.add('seen');
            hasSeen = true;
        }

        var setRead = function () {
            localStorage.setItem(readKey, true);
            hasRead = true;
            comment.classList.add('read');
        }

        var seenKey = "hackernews:comments:seen:" + replyId;
        var readKey = "hackernews:comments:read:" + replyId;

        var hasSeen = localStorage.getItem(seenKey);
        var hasRead = localStorage.getItem(readKey);
        
        hasSeen && setSeen();
        hasRead && setRead();
        
        var autoReadTimeout = null;
        var autoSeenTimeout = null;
        



        comment.addEventListener('mouseover', event => {

            if (!autoSeenTimeout) {
                setTimeout(setSeen, 1000);
            }
            if (!autoReadTimeout) {
                autoReadTimeout = setTimeout(setRead, 2500)
            }
        });

        comment.addEventListener('mouseout', event => {
            clearTimeout(autoReadTimeout);
            autoReadTimeout = null;

            clearTimeout(autoSeenTimeout);
            autoSeenTimeout = null;
        });

        comment.addEventListener('click', event => {
            setRead()
        });

        comment.classList.add('processed');        
    });
}
document.addEventListener('DOMContentLoaded', processComments);

// Comments that are loaded later
setInterval(processComments, 5000);
