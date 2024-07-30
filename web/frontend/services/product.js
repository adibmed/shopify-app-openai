
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useFetch } from '../hooks';

export const useProducts = () => {
    const { get } = useFetch();
    const { data, ...rest } = useQuery({
        queryFn: () => get('/api/products'),
        queryKey: ['products'],
        refetchOnWindowFocus: false,
    });

    return {
        data: data || null,
        ...rest,
    };
};




export const useProductUpdate = () => {
    const { post, mutate } = useFetch();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const update = useCallback(
        async (body) => {
            setIsLoading(true);
            const response = await post('/api/update', body);
            await mutate("products")
            setIsLoading(false);
            return response;
        }, [post, queryClient]);

    return {
        update,
        isLoading,
    };
}
