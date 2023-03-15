const bcryptjs = require('bcryptjs');
const User = require("../models/user")

const getUsers = async(req, res) => {
    const {limit = 5, offset = 0} = req.query;
    const query = {enabled: true};
  
    const [total, users] = await Promise.all([
        User.countDocuments(query), 
        User.find(query).limit(limit).skip(offset)
    ])

    res.json({ total, users });
}

const getUserById = async(req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    res.json({ user });
}

const createUser = async (req, res) => {
    const {name, email, password, roles} = req.body;
    const user = new User({name, email, password, roles});
    
    const salt = bcryptjs.genSaltSync();
    user.password = bcryptjs.hashSync(password, salt);
    
    user.save();
    res.json(user)
}

const updateUser = async(req, res) => {
    const { id } = req.params;
    const { _id, password, google, email, ...others } = req.body; 

    if (password) {
        const salt = bcryptjs.genSaltSync();
        others.password = bcryptjs.hashSync(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, others, {new: true});

    res.json({ user });
}

const deleteUser = async(req, res) => {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { enabled:false });
    if (!user) {
        return res.code(404).json({msg: "User not found"});
    }
    res.json( user );
}

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
}