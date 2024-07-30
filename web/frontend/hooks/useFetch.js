import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';

export const useFetch = () => {
    const fetch = useAuthenticatedFetch();
    const queryClient = useQueryClient();

    const get = useCallback(
        (url) => {
            return fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })
                .then((r) => r.text())
                .then((text) => JSON.parse(text));
        },
        [fetch]
    );

    const post = useCallback(
        (url, body) =>
            fetch(url, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' },
            }).then((r) => r.json()),
        [fetch]
    );


    return {
        get,
        post,
        mutate: (key) => queryClient.invalidateQueries(key),
    };
};
