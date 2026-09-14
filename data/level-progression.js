// Level is separate from content difficulty tier and equipment affix tier.
const LEVEL_PROGRESSION = Object.freeze({
    tierAnchors: Object.freeze([[1,1], [7,25], [20,77], [60,137]]),
    // Indexed by level - 1. Player requirements and monster rewards are independently authored.
    // Lv.1-10 keeps the prior curve. Each following decade adds a larger requirement premium.
    playerExperienceRequired: Object.freeze([
        76, 118, 170, 227, 289, 356, 427, 502, 579, 660, // Lv.1-10
        747, 838, 931, 1029, 1129, 1232, 1340, 1449, 1562, 1677, // Lv.11-20
        1789, 1966, 2188, 2443, 2730, 3045, 3386, 3753, 4145, 4559, // Lv.21-30
        5018, 5503, 6014, 6552, 7114, 7702, 8315, 8956, 9620, 10311, // Lv.31-40
        11069, 11859, 12677, 13529, 14410, 15324, 16269, 17245, 18254, 19294, // Lv.41-50
        20000, 21080, 22437, 24036, 25863, 27906, 30161, 32621, 35288, 38157, // Lv.51-60
        41344, 44750, 48375, 52219, 56287, 60580, 65099, 69847, 74826, 80040, // Lv.61-70
        85695, 91609, 97787, 104230, 110945, 117931, 125194, 132735, 140561, 148670, // Lv.71-80
        157392, 166432, 175797, 185484, 195504, 205856, 216546, 227576, 238952, 250675, // Lv.81-90
        263213, 276136, 289452, 303161, 317268, 331777, 346693, 362019, 377760, 393919, // Lv.91-100
    ]),
    // Fractional base XP preserves early-loop bonus rounding. Final rewards remain integers.
    // Beyond Lv.100, rewards grow gently while player requirements retain the steep endgame curve.
    monsterExperience: Object.freeze([
        24, 24, 24, 24, 24, 24, 25.62, 30.12, 34.74, 39.6, // Lv.1-10
        44.64, 49.8, 55.08, 60.54, 66.12, 71.82, 77.7, 83.64, 89.7, 95.88, // Lv.11-20
        101.28, 110.28, 121.56, 134.52, 148.92, 164.64, 181.44, 199.32, 218.16, 237.9, // Lv.21-30
        258.48, 279.84, 301.98, 324.9, 348.48, 372.72, 397.56, 423.12, 449.22, 475.92, // Lv.31-40
        503.16, 531, 559.32, 588.24, 617.58, 647.52, 677.88, 708.72, 740.04, 771.78, // Lv.41-50
        786.9, 816, 854.76, 901.38, 954.96, 1014.78, 1080.42, 1151.34, 1227.42, 1308.24, // Lv.51-60
        1393.62, 1483.44, 1577.46, 1675.5, 1777.5, 1883.34, 1992.84, 2105.94, 2222.58, 2342.64, // Lv.61-70
        2466.06, 2592.72, 2722.62, 2855.64, 2991.78, 3130.92, 3273.06, 3418.08, 3566.04, 3716.76, // Lv.71-80
        3870.3, 4026.6, 4185.66, 4347.3, 4511.64, 4678.56, 4848.06, 5020.08, 5194.62, 5371.62, // Lv.81-90
        5551.08, 5732.94, 5917.26, 6103.92, 6292.92, 6484.26, 6677.88, 6873.78, 7071.96, 7272.36, // Lv.91-100
        7473.96, 7677.96, 7884.36, 8093.16, 8304.36, 8517.96, 8733.96, 8952.36, 9173.16, 9396.36, // Lv.101-110
        9621.96, 9849.96, 10080.36, 10313.16, 10548.36, 10785.96, 11025.96, 11268.36, 11513.16, 11760.36, // Lv.111-120
        12009.96, 12261.96, 12516.36, 12773.16, 13032.36, 13293.96, 13557.96, 13824.36, 14093.16, 14364.36, // Lv.121-130
        14637.96, 14913.96, 15192.36, 15473.16, 15756.36, 16041.96, 16329.96, 16620.36, 16913.16, 17208.36, // Lv.131-140
        17505.96, 17805.96, 18108.36, 18413.16, 18720.36, 19029.96, 19341.96, 19656.36, 19973.16, 20292.36, // Lv.141-150
        20613.96, 20937.96, 21264.36, 21593.16, 21924.36, 22257.96, 22593.96, 22932.36, 23273.16, 23616.36, // Lv.151-160
        23961.96, 24309.96, 24660.36, 25013.16, 25368.36, 25725.96, 26085.96, 26448.36, 26813.16, 27180.36, // Lv.161-170
        27549.96, 27921.96, 28296.36, 28673.16, 29052.36, 29433.96, 29817.96, 30204.36, 30593.16, 30984.36, // Lv.171-180
        31377.96, 31773.96, 32172.36, 32573.16, 32976.36, 33381.96, 33789.96, 34200.36, 34613.16, 35028.36, // Lv.181-190
        35445.96, 35865.96, 36288.36, 36713.16, 37140.36, 37569.96, 38001.96, 38436.36, 38873.16, 39312.36, // Lv.191-200
    ]),
    monsterExperienceOverflowStep: 439.2,
    // Lv.1-13 thresholds are unchanged (reaching Lv.14). Lv.20 is the cap.
    gemExperienceRequired: Object.freeze([100, 130, 169, 219, 285, 371, 482, 627, 815, 1060, 1378, 1792, 2329, 10000, 28000, 75000, 190000, 480000, 1200000, 0]),
    loopExperienceBase: 1, loopExperiencePerLoop: 0.05, loopExperienceBonusCap: 2,
    experienceGap: 5, experienceDecay: 0.10,
    lootGap: 10, lootDecay: 0.085,
    equipmentLevelDiscount: 8,
    // Base reqTier 1..22, not rolled affix tier. Early bases stay accessible; late bases need investment.
    attributeRequirements: Object.freeze([0, 0, 6, 10, 15, 21, 28, 36, 44, 52, 61, 70, 78, 86, 94, 102, 110, 117, 124, 130, 135, 140]),
    // Entry tickets and deterministic completion rewards do not enter this list.
    ordinaryCurrencies: Object.freeze(['magicBud','formlessDew','blightSpore','goldenRule','fairyRing','sapBud',
        'ouroboros','pruningShears','abyssCatalyst','skyEssence','emberBranch','jewelShard','sealShard',
        'strongSealShard','radiantSealShard','blessing','fossil','fossilBulwark','fossilWedge','fossilOld',
        'fossilRift','deepWhetstone','rootIron','jewelPolish','runeShard','blurred45','underCopper','underSilver','underGold','bossCore'])
});
