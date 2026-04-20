import { useState, useEffect } from 'react';

const useCustom = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Simulating an API call
                const response = await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({ message: 'Hello from the mocked API!' });
                    }, 1000);
                });
                setData(response);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading, error };
};

export default useCustom;