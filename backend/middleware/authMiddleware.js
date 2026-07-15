import jwt from 'jsonwebtoken'

export default function authToken(req, res, next){
    const authHeader = req.headers.authorization;
    const tokenFromCookie = req.cookies?.accessToken;  //Extrae la cookie creada al iniciar sesión satisfactoriamente
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = tokenFromCookie || tokenFromHeader //Busca tanto el token de la cookie como del header en caso de que uno no se almacene

    if(!token){
        return res.status(401).json({message: "Usuario sin token"})
    }

    try {
        const data= jwt.verify(token, process.env.JWT_SECRET) //Verifica el token actual y lo compara con la secret key
        req.user= data
        next() //Envía a la ruta o middleware procedente
    }
    catch (error){
        console.error('JWT inválido ->', error.message)
        return res.status(401).json({ error: 'Token inválido' })
    }
}