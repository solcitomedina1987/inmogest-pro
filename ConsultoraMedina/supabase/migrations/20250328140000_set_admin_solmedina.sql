-- Otorgar rol administrador al usuario solmedina87@gmail.com
-- Requisito: el usuario debe existir en auth.users (registrado) para que exista la fila en public.perfiles.

UPDATE public.perfiles
SET rol = 'admin',
    updated_at = NOW()
WHERE lower(trim(email)) = lower(trim('solmedina87@gmail.com'));

-- Comprobar que se actualizó una fila (en el editor verás "UPDATE 1").
-- Si devuelve UPDATE 0: registrate primero en la app o creá el usuario en Authentication → Users.
