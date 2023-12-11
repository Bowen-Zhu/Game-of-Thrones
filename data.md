# Data Documentation

This documentation provides an overview of the data files used in the project, including their structure and content.

## `data/characters.json`

Contains detailed information about characters from the "Game of Thrones" TV series.

- `characterName`: Name of the character.
- `characterLink`: Link to the character's page on IMDb.
- `characterImageThumb`: Thumbnail image of the character.
- `characterImageFull`: Full image of the character.
- `actorName`: Name of the actor (or `actors` array if multiple).
- `actors`: Array of objects containing actor details.
  - `actorName`: Name of the actor.
  - `actorLink`: Link to the actor's IMDb page.
  - `seasonsActive`: Array of integers representing seasons in which the actor was active.
- `houseName`: Array of houses to which the character belongs.
- `nickname`: Character's nickname.
- `royal`: Boolean indicating if the character is royal.
- `kingsguard`: Boolean indicating if the character is a member of the Kingsguard.
- `parents`, `parentOf`, `guardianOf`, `guardedBy`, `siblings`, `marriedEngaged`, `allies`, `abducted`, `killed`, `killedBy`, `serves`, `servedBy`: Arrays containing relevant character relationships.

## `data/characters-groups.json`

Groups characters into various categories in the TV series.

- `group`: Array of objects.
  - `name`: Name of the group.
  - `characters`: Array of character names belonging to the group.

## `data/episodes.json`

Detailed information about each episode from the TV series.

- `seasonNum`: Season number.
- `episodeNum`: Episode number.
- `episodeTitle`: Title of the episode (from IMDb).
- `episodeLink`: Link to the episode's IMDb page.
- `episodeAirDate`: Air date of the episode (from IMDb).
- `episodeDescription`: Description of the episode (from IMDb).
- `openingSequenceLocations`: Array of locations featured in the opening sequence.
- `scenes`: Array of scenes in the episode.
  - Each scene contains details such as `sceneStart`, `sceneEnd`, `location`, `characters` involved, and other relevant information.

## `data/battles.csv`

This file contains information on various battles in the book series, with the following fields:

- `Name`: The name of the battle. (Categorical)
- `Year`: The year of the battle. (Ordinal)
- `Battle_number`: A unique ID number for the battle. (Ordinal)
- `Attacker_king`: The king on the attacking side. (Categorical)
- `Defender_king`: The king on the defending side. (Categorical)
- `Attacker_1` to `Attacker_4`: Major houses involved in the attack. (Categorical)
- `Defender_1` to `Defender_4`: Major houses involved in the defense. (Categorical)
- `Attacker_outcome`: The outcome for the attacker (win/loss). (Categorical)
- `Battle_type`: Type of the battle (e.g., pitched battle, siege, ambush). (Categorical)
- `Major_death`: Indicates if there was a major death. (Categorical)
- `Major_capture`: Indicates if there was a major capture. (Categorical)
- `Attacker_size`: The size of the attacker's force. (Quantitative)
- `Defender_size`: The size of the defender's force. (Quantitative)
- `Attacker_commander`: Commanders of the attacking forces. (Categorical)
- `Defender_commander`: Commanders of the defending forces. (Categorical)
- `Summer_commander`: Indicates if the battle occurred during summer. (Categorical)
- `Location`: The location of the battle. (Categorical)
- `Region`: The region where the battle took place. (Categorical)

## `data/character-deaths.csv`

This file documents the deaths of various characters in the book series, with the following fields:

- `Name`: Character name. (Categorical)
- `Allegiances`: Character's house allegiance. (Categorical)
- `Death Year`: The year in which the character died. (Ordinal)
- `Book of Death`: The book in which the character died. (Ordinal)
- `Death Chapter`: The chapter of the book in which the character died. (Ordinal)
- `Book Intro Chapter`: The chapter in which the character was first introduced. (Ordinal)
- `Gender`: 1 for male, 0 for female. (Categorical)
- `Nobility`: 1 for noble, 0 for commoner. (Categorical)
- `GoT`, `CoK`, `SoS`, `FfC`, `DwD`: Indicates whether the character appeared in each of the five books (1 for yes, 0 for no). (Categorical)
