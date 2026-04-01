const searchCSV = async (query) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/search-csv?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok)
      throw new Error("Some error occured while executing query");
    const data = response.json();
    return data;
  } catch (error) {
    console.log("Some error occured while routing query to backend");
  }
};

export default searchCSV;
