async function currencyUse(page,key) {
    const catalog=page.locator('.cl-catalog');
    if(await catalog.isVisible())await catalog.locator('[data-close]').click();
    const favorite=page.locator(`#crafting-workspace [data-recipe="${key}"]`);
    if(await favorite.count())await favorite.click();
    else {
        await page.getByRole('button',{name:'기타 재화',exact:true}).click();
        await catalog.locator('[data-category="all"]').click();
        await catalog.locator(`[data-resource="${key}"]`).click();
        const select=catalog.locator('[data-apply]');
        if(await select.isDisabled())return select;
        await select.click();
    }
    return page.locator('#crafting-workspace [data-command="craft"]');
}
module.exports={currencyUse};
