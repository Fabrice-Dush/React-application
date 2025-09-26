export const wait = function (sec) {
  return new Promise(function (resolve, reject) {
    setTimeout(
      () => reject(`Request took too long. Timeout after ${sec} seconds.`),
      sec * 1000
    );
  });
};

export const transformObject = function (obj) {
  const object = Object.entries(obj).reduce((acc, [key, value]) => {
    const [first, second] = key.toLocaleLowerCase().split("_");
    //prettier-ignore
    acc[`${first}${second?.replace(second[0], second[0].toUpperCase()) ?? ""}`] = value;
    return acc;
  }, {});

  return object;
};
