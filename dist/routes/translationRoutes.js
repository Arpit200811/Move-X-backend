"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const translationController_1 = require("../controllers/translationController");
const router = express_1.default.Router();
router.get('/:lang', translationController_1.getTranslations);
router.post('/seed', translationController_1.seedTranslations);
exports.default = router;
//# sourceMappingURL=translationRoutes.js.map