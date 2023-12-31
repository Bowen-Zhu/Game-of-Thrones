/* * * * * * * * * * * * * *
*           MAIN           *
* * * * * * * * * * * * * */

async function loadData() {
    try {
        const charactersResponse = await fetch('data/characters.json');
        const episodesResponse = await fetch('data/episodes.json');
        const groupsResponse = await fetch('data/characters-groups.json');
        const battlesResponse = await fetch('data/battles.csv');
        const deathsResponse = await fetch('data/character-deaths.csv');

        if (!charactersResponse.ok || !episodesResponse.ok) {
            throw new Error('Network response was not ok.');
        }

        const charactersData = await charactersResponse.json();
        const episodesData = await episodesResponse.json();
        const groupsData = await groupsResponse.json();
        const battlesText = await battlesResponse.text();
        const battlesData = Papa.parse(battlesText, { header: true, dynamicTyping: true }).data;
        const deathsText = await deathsResponse.text();
        const deathsData = Papa.parse(deathsText, { header: true, dynamicTyping: true }).data;


        return {
            charactersData: charactersData,
            episodesData: episodesData,
            groupsData: groupsData,
            battlesData: battlesData,
            deathsData: deathsData
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

function wrangleData(charactersData, episodesData, groupsData) {
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
                    seasonNum: episode.seasonNum,
                    episodeNum: episode.episodeNum,
                    sceneStart: scene.sceneStart,
                    sceneEnd: scene.sceneEnd,
                    duration: sceneDuration
                });

                character.totalScreenTime += sceneDuration;
            });
        });
    });

    // Create a map for character to group
    let characterGroupMap = {};
    groupsData.groups.forEach(group => {
        group.characters.forEach(characterName => {
            // Check if the group name is 'Include' and change it to 'None'
            let groupName = group.name === 'Include' ? 'None' : group.name;

            if (characterGroupMap[characterName]) {
                // If the character is already in the map, it's a duplicate
                console.warn(`Duplicate group entry found for character: ${characterName}`);
            } else {
                characterGroupMap[characterName] = groupName;
            }
        });
    });

    // Add group info to characters (not exactly the houses)
    characters.forEach(character => {
        charactersMap[character.characterName].group = characterGroupMap[character.characterName] || 'None';
    });

    // Convert the Map to an Array
    let characterArray = Object.values(charactersMap);

    // Sort Characters by Total Screen Time in Descending Order
    characterArray.sort((a, b) => b.totalScreenTime - a.totalScreenTime);

    return characterArray;
}

function sortCharactersByGroup(processedData, groupsData) {
    // List of groups in the desired order
    const groupOrder = groupsData.groups.map(group => group.name);

    let groupedData = [...processedData];
    // Sort function
    groupedData.sort((a, b) => {
        let groupA = groupOrder.indexOf(a.group);
        let groupB = groupOrder.indexOf(b.group);

        // Handle characters not in any group
        if (groupA === -1) groupA = Infinity;
        if (groupB === -1) groupB = Infinity;

        return groupA - groupB || b.totalScreenTime - a.totalScreenTime; // If same group, sort by screentime
    });

    return groupedData;
}

function calculateSharedTime(character1, character2) {
    let sharedTime = 0;
    character1.timePeriods.forEach(period1 => {
        character2.timePeriods.forEach(period2 => {
            if (period1.sceneStart === period2.sceneStart &&
                period1.sceneEnd === period2.sceneEnd &&
                period1.seasonNum === period2.seasonNum &&
                period1.episodeNum === period2.episodeNum) {
                sharedTime += period1.duration;
            }
        });
    });
    return sharedTime;
}

function createSharedScreenTimeMatrix(processedData, topN) {
    // Initialize the matrix with zeros
    let matrix = Array.from({ length: topN }, () => Array(topN).fill(0));

    // Calculate shared screen time
    for (let i = 0; i < topN; i++) {
        for (let j = i; j < topN; j++) {
            if (i === j) {
                // Diagonal element: total screen time of the character
                matrix[i][j] = processedData[i].totalScreenTime;
            } else {
                // Shared screen time between character i and j
                let sharedTime = calculateSharedTime(processedData[i], processedData[j]);
                matrix[i][j] = matrix[j][i] = sharedTime;
            }
        }
    }
    return matrix;
}

function createSharedScreenTimeMatrixCustomize(characterArray) {
    let n = characterArray.length; // The size of the matrix is based on the input array length
    let matrix = Array.from({ length: n }, () => Array(n).fill(0));

    // Calculate shared screen time
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            if (i === j) {
                // Diagonal element: total screen time of the character
                matrix[i][j] = characterArray[i].totalScreenTime;
            } else {
                // Shared screen time between character i and j
                let sharedTime = calculateSharedTime(characterArray[i], characterArray[j]);
                matrix[i][j] = matrix[j][i] = sharedTime;
            }
        }
    }
    return matrix;
}

let topN = 50;
let processedDataFull;
let processedData;
let matrix;
let groupedData;
let groupedMatrix;
const relationshipInsight = document.getElementById('relationshipInsight');
const battlesInsight = document.getElementById('battlesInsight');

// Set the default visibility
relationshipInsight.style.display = 'block';
battlesInsight.style.display = 'none';

loadData().then(data => {
    processedDataFull = wrangleData(data.charactersData, data.episodesData, data.groupsData);
    // Slice the Top N Characters
    processedData = processedDataFull.slice(0, topN);
    matrix = createSharedScreenTimeMatrix(processedData, topN);

    groupedData = sortCharactersByGroup(processedData, data.groupsData);
    groupedMatrix = createSharedScreenTimeMatrixCustomize(groupedData);

    const characterNames = processedData.map(character => character.characterName);
    const storyline = new Storyline("storyline", processedData);
    const relationshipMatrix = new RelationshipMatrix(matrix, "matrix", characterNames, processedData);
    const relationshipNetwork = new RelationshipNetwork("network", processedData, matrix, groupedData);

    const scatterplot = new Scatterplot(processedDataFull, data.deathsData, data.battlesData);
    scatterplot.drawRelationships();
    const barchart = new Barchart("popUp-Barchart", data.battlesData);

    document.addEventListener("nodeSelected", function(event) {
        let selectedNodes = event.detail;
        console.log('Submitted Nodes in main.js:', selectedNodes);

        let selectedCharacterNames = selectedNodes.map(node => node.characterName);
        storyline.update(selectedCharacterNames);
        relationshipMatrix.updateMatrix(selectedCharacterNames);
        scatterplot.selectedCharacterNames = selectedCharacterNames;
        scatterplot.highlight();
    });

    document.getElementById('select-node').addEventListener('click', function() {
        relationshipNetwork.submitSelectedNodes();
    });

    document.getElementById('reload-node').addEventListener('click', function() {
        relationshipNetwork.reloadSelectedNodes();
        relationshipMatrix.updateMatrix([], true);
        relationshipMatrix.resetMatrix();
        storyline.update([]);
        scatterplot.selectedCharacterNames = [];
        scatterplot.highlight();
    });

    document.getElementById('button1').addEventListener('click', function() {
        scatterplot.drawRelationships();
        scatterplot.highlight();
        relationshipInsight.style.display = 'block';
        battlesInsight.style.display = 'none';
    });

    document.getElementById('button2').addEventListener('click', function() {
        scatterplot.drawBattles();
        scatterplot.highlight();
        relationshipInsight.style.display = 'none';
        battlesInsight.style.display = 'block';
    });
    document.getElementById('groupSelect').addEventListener('change', function() {
        let selectedGroup = this.value;
        relationshipMatrix.updateMatrixBasedOnGroup(selectedGroup);
    });
    document.getElementById('matrixReset').addEventListener('click', function() {
        relationshipNetwork.reloadSelectedNodes();
        relationshipMatrix.resetMatrix();
        storyline.update([]);
        scatterplot.selectedCharacterNames = [];
        scatterplot.highlight();
        document.getElementById('groupSelect').value = 'All';
    });

}).catch(error => {
    console.error('Error processing data:', error.message);
});
$(document).ready(function () {
    $(window).on('scroll', function () {
        $('section').each(function () {
            if ($(window).scrollTop() >= $(this).offset().top) {
                var sectionId = $(this).attr('id');
                $('.navbar-nav .nav-link, .navbar-nav .dropdown-item').removeClass('active');
                $('.navbar-nav a[href="#' + sectionId + '"]').addClass('active');
            }
        });
    });
    $('.scroll-arrow').click(function() {
        var nextSection = $(this).closest('section').next('section');
        if (nextSection.length) {
            $('html, body').animate({
                scrollTop: nextSection.offset().top
            }, 100);
        } else {
            console.log("No next section found");
        }
    });
    $('.animated-text').each(function(i) {
        var delay = 1500 * (i + 1);
        $(this).delay(delay).queue(function() {
            $(this).addClass('visible').dequeue();
        });
    });
    $('.dropdown-menu>li>a').on('click', function(){
        $('.navbar-collapse').collapse('hide');
    });
});