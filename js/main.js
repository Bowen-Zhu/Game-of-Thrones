/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

async function loadData() {
    try {
        const charactersResponse = await fetch('data/characters.json');
        const episodesResponse = await fetch('data/episodes.json');

        if (!charactersResponse.ok || !episodesResponse.ok) {
            throw new Error('Network response was not ok.');
        }

        const charactersData = await charactersResponse.json();
        const episodesData = await episodesResponse.json();

        return {
            charactersData: charactersData,
            episodesData: episodesData
        };
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// to convert scene start/end times into seconds
function sec(timeString){
    var sec = 0;
    if (timeString.length == 0) return sec;
    var splitArray = timeString.split(":");
    sec = 3600*parseFloat(splitArray[0])+60*parseFloat(splitArray[1])+parseFloat(splitArray[2]);
    return sec;
}

function wrangleData(charactersData, episodesData, topN) {
    // Parse JSON Data
    const characters = charactersData.characters;
    const episodes = episodesData.episodes;

    // (For efficiency) create a set of character names from charactersData
    // const characterNames = new Set(characters.map(character => character.characterName));

    // Create a Characters Map
    const charactersMap = {};
    characters.forEach(character => {
        charactersMap[character.characterName] = {
            ...character,
            timePeriods: [],
            totalScreenTime: 0
        };
    });

    // Process Episode Data
    episodes.forEach(episode => {
        episode.scenes.forEach(scene => {
            scene.characters.forEach(sceneCharacter => {
                let character = charactersMap[sceneCharacter.name];
                // Check if character in episodesData exists in charactersData
                if (!character) {
                    console.log(`Character not found in charactersData: ${sceneCharacter.name}... Added to list.`);
                    charactersMap[sceneCharacter.name] = {
                        characterName: sceneCharacter.name,
                        timePeriods: [],
                        totalScreenTime: 0
                    };
                    character = charactersMap[sceneCharacter.name];
                }
                const startSec = sec(scene.sceneStart);
                const endSec = sec(scene.sceneEnd);
                const sceneDuration = endSec - startSec;

                character.timePeriods.push({
                    sceneStart: scene.sceneStart,
                    sceneEnd: scene.sceneEnd,
                    duration: sceneDuration
                });

                character.totalScreenTime += sceneDuration;
            });
        });
    });

    // Convert the Map to an Array
    let characterArray = Object.values(charactersMap);

    // Sort Characters by Total Screen Time in Descending Order
    characterArray.sort((a, b) => b.totalScreenTime - a.totalScreenTime);

    // Slice the Top N Characters
    return characterArray.slice(0, topN);
}

let topN = 30;
let processedData;
loadData().then(data => {
    processedData = wrangleData(data.charactersData, data.episodesData, topN);
}).catch(error => {
    console.error('Error processing data:', error.message);
});
