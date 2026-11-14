/** Static Woodsman effect anchors and elemental frame timings. */
export const WOODSMAN_BLADE = [
    [70,-22], [68,-28], [-60,-134], [71,-52], [91,-103], [77,-52], [70,-22], [70,-22],
    [70,-22], [62,-104], [-54,-159], [-46,-169], [86,-24], [77,-34], [73,-43], [70,-22],
    [70,-22], [41,-127], [25,-167], [63,-165], [64,-165], [70,-162], [50,-111], [70,-22]
];
export const WOODSMAN_SHAPES = {
    phys: { slash: [20,55,75,110], impact: [25,55,80,130], speed: .14, rise: -.035, size: 1.12 },
    fire: { slash: [30,65,100,140], impact: [30,70,110,180], speed: .10, rise: .14, size: 1.32 },
    cold: { slash: [15,45,65,95], impact: [20,100,100,150], speed: .27, rise: 0, size: 1.36 },
    light: { slash: [15,35,35,65], impact: [15,35,45,100], speed: .42, rise: 0, size: 1.42 },
    chaos: { slash: [60,100,100,140], impact: [60,100,110,180], speed: .045, rise: -.04, size: 1.34 }
};
